var plumbdb = require('plumbdb')
var http = require('http')
var url = require('url')
var qs = require('querystring')
var routes = require('routes')
var Router = routes.Router
var Route = routes.Route
var router = new Router()

function Plumb(name, cb) {
  var me = this
  me.plumbdb = plumbdb(name, function(err, db) {
    cb(err, me.createServer())
  })
  router.addRoute("/", this.hello)
  router.addRoute("/favicon.ico", this.hello)
  router.addRoute("/_changes*", this.changes)
  router.addRoute("/_changes", this.changes)
  router.addRoute("/:id", this.document)
}

Plumb.prototype.createServer = function() {
  var me = this
  return http.createServer(function(req, res) {
    me.handler.call(me, req, res)
  })
}

Plumb.prototype.handler = function(req, res) {
  req.route = router.match(req.url)
  if (!req.route) return this.error(res, 404)
  req.route.fn.call(this, req, res)
}

Plumb.prototype.changes = function(req, res) {
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

Plumb.prototype._sendChanges = function(start, end, res) {
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
Plumb.prototype._getLast = function(cb) {
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

Plumb.prototype.error = function(res, status, message) {
  res.statusCode = status || 500
  var json = {error: res.statusCode, message: message}
  this.json(res, json)
}

Plumb.prototype.hello = function(req, res) {
  if (req.method === "POST") return this.document(req, res)
  this.json(res, {"plumb": "Welcome", "version": 1})
}

Plumb.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json))
}

Plumb.prototype.get = function(req, res) {
  var me = this
  this.plumbdb.get(req.route.params.id, function(err, json) {
    if (err) return me.error(res, 500)
    if (json === null) return me.error(res, 404)
    me.json(res, json)
  })
}

Plumb.prototype.post = function(req, res) {
  var me = this
  this.plumbdb.put(req, function(err, json) {
    if (err) return me.error(res, 500)
    me.json(res, json)
  })
}

Plumb.prototype.document = function(req, res) {
  var me = this
  if (req.method === "GET") return this.get(req, res)
  if (req.method === "POST") return this.post(req, res)
}

var plumb = new Plumb('test', function(err, server) {
  server.listen(8000)
  console.log('8000')
})