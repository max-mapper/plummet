var plumbdb = require('plumbdb')
var http = require('http')
var url = require('url')
var qs = require('querystring')
var routes = require('routes')

function Plummet(name, cb) {
  var me = this
  this.plumbdb = plumbdb(name, function(err, db) {
    cb(err, me.createServer())
  })
  this.router = new routes.Router()
  this.createRoutes()
}

Plummet.prototype.createRoutes = function() {
  this.router.addRoute("/", this.hello)
  this.router.addRoute("/favicon.ico", this.hello)
  this.router.addRoute("/_changes*", this.changes)
  this.router.addRoute("/_changes", this.changes)
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
  me._getLast(function(err, last) {
    if (err) return me.error(res, 500, err)
    me._sendChanges(query.since, last, res)
  })
}

Plummet.prototype._sendChanges = function(start, end, res) {
  var me = this
  this.plumbdb.db.iterator(function(err, iterator) {
    if (err) return me.error(res, 500, err)
    var pre = '{"rows": [', sep = "", post = ']}'
    res.write(pre)
    iterator.forRange(start, end, function(err, key, val) {
      if (key === end) return res.end(post)
      if (key === start) return
      res.write(sep + val)
      sep = ","
    })
  })
}

// hack until node-leveldb gets streams
Plummet.prototype._getLast = function(cb) {
  this.plumbdb.db.iterator(function(err, iterator) {
    if (err) return cb(err)
    iterator.last(function(err) {
      if (err) return cb(err)
      iterator.current(function(err, key, val) {
        cb(err, key)
      })
    })
  })
}

Plummet.prototype.error = function(res, status, message) {
  res.statusCode = status || 500
  var json = {error: res.statusCode, message: message}
  this.json(res, json)
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

Plummet.prototype.document = function(req, res) {
  var me = this
  if (req.method === "GET") return this.get(req, res)
  if (req.method === "POST") return this.post(req, res)
}

var plummet = new Plummet('test', function(err, server) {
  server.listen(8000)
  console.log('8000')
})