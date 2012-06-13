var plumbdb = require('plumbdb')
var http = require('http')
var url = require('url')
var qs = require('querystring')
var routes = require('routes')
var request = require('request').defaults({json: true})

function Plummet(name, cb) {
  var me = this
  this.plumbdb = plumbdb(name, function(err, db) {
    cb(err, me.createServer())
  })
  this.createRoutes()
}

module.exports = function(name, cb) {
  return new Plummet(name, cb)
}

module.exports.Plummet = Plummet

Plummet.prototype.createRoutes = function() {
  this.router = new routes.Router()
  this.router.addRoute("/", this.hello)
  this.router.addRoute("/favicon.ico", this.hello)
  this.router.addRoute("/_changes*", this.changes)
  this.router.addRoute("/_changes", this.changes)
  this.router.addRoute("/_push", this.push)
  // this.router.addRoute("/_pull", this.pull)
  this.router.addRoute("/_bulk", this.bulk)
  this.router.addRoute("/:id", this.document)
}

Plummet.prototype.createServer = function() {
  var me = this
  return http.createServer(function(req, res) {
    me.handler.call(me, req, res)
  })
}

Plummet.prototype.handler = function(req, res) {
  req.route = this.router.match(req.url)
  if (!req.route) return this.error(res, 404)
  req.route.fn.call(this, req, res)
}

Plummet.prototype.changes = function(req, res) {
  var me = this
  res.setHeader('content-type', 'application/json')
  var parsedURL = url.parse(req.url)
  if (parsedURL.query) query = qs.parse(parsedURL.query)
  else query = {since: "0"}
  me.plumbdb._getLast(function(err, last) {
    if (err) return me.error(res, 500, err)
    if (!last) last = query.since
    me._sendChanges(query.since, last, res)
  })
}

Plummet.prototype._sendChanges = function(start, end, res) {
  var me = this
  this.plumbdb.db.iterator(function(err, iterator) {
    if (err) return me.error(res, 500, err)
    var pre = '{"rows": [', sep = "", post = ']}'
    res.write(pre)
    if (start === end) return res.end(post)
    iterator.forRange(start, end, function(err, key, val) {
      if (key === start) return
      res.write(sep + val)
      sep = ","
      if (key === end) return res.end(post)
    })
  })
}

Plummet.prototype.error = function(res, status, message) {
  if (!status) status = res.statusCode
  if (message) {
    if (message.status) status = message.status
    if (typeof message === "object") message.status = status
    if (typeof message === "string") message = {error: status, message: message}
  }
  res.statusCode = status || 500
  this.json(res, message)
}

Plummet.prototype.hello = function(req, res) {
  if (req.method === "POST") return this.document(req, res)
  this.json(res, {"plummet": "Welcome", "version": 1})
}

Plummet.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json))
}

Plummet.prototype.get = function(req, res) {
  var me = this
  this.plumbdb.get(req.route.params.id, function(err, json) {
    if (err) return me.error(res, 500)
    if (json === null) return me.error(res, 404)
    me.json(res, json)
  })
}

Plummet.prototype.post = function(req, res) {
  var me = this
  this.plumbdb.put(req, function(err, json) {
    if (err) return me.error(res, 500)
    me.json(res, json)
  })
}

Plummet.prototype.bulk = function(req, res) {
  var me = this
  this.plumbdb.bulk(req, function(err, results) {
    if (err) return me.error(res, 500, err)
    me.json(res, results)
  })
}

Plummet.prototype._requestBody = function(req, cb) {
  var buffers = [], error = false
  req.on('data', function (chunk) {
    buffers.push(chunk)
  })
  req.on('end', function (chunk) {
    if (chunk) buffers.push(chunk)
    if (error) return
    var body = buffers.join('')
    return cb(false, body)
  })
  req.on('error', function (err) {
    error = true
    cb(err)
  })
}

Plummet.prototype._requestJSON = function(req, cb) {
  this._requestBody(req, function(err, body) {
    if (err) return cb(err)
    if (req.headers['content-type'].split(';')[0] === 'application/json') {
      try {
        return cb(false, JSON.parse(body))
      } catch (e) {
        return cb(e)
      }
    }
    return cb({"status": 415, "error":"bad_content_type", "reason":"content-type must be application/json"})
  })
}

Plummet.prototype.push = function(req, res) {
  var me = this
  this._requestJSON(req, function(err, json) {
    if (err) return me.error(res, err.status, err)
    if (!json.target) return me.error(res, 400, "you must specify a replication target")
    var target = url.parse(json.target)
    if (!target.protocol || !target.protocol.match(/http/)) return me.error(res, 400, "bad target URL")
    me.plumbdb._getLast(function(err, last) {
      if (err) return me.error(res, 500, err)
      request(url.format(target) + '_changes?since=' + last, function(err, resp, json) {
        if (err) return me.error(res, 500, err)
        me.json(res, json)
      })
    })
  })
}

Plummet.prototype.document = function(req, res) {
  var me = this
  if (req.method === "GET") return this.get(req, res)
  if (req.method === "POST") return this.post(req, res)
}