var catdb = require('catdb')
var http = require('http')
var url = require('url')
var qs = require('querystring')
var routes = require('routes')
var Router = routes.Router
var Route = routes.Route
var router = new Router()

function Cat(name, cb) {
  var me = this
  me.catdb = catdb(name, function(err, db) {
    cb(err, me.createServer())
  })
  router.addRoute("/", this.hello)
  router.addRoute("/favicon.ico", this.hello)
  router.addRoute("/_changes*", this.changes)
  router.addRoute("/_changes", this.changes)
  router.addRoute("/:id", this.document)
}

Cat.prototype.createServer = function() {
  var me = this
  return http.createServer(function(req, res) {
    me.handler.call(me, req, res)
  })
}

Cat.prototype.handler = function(req, res) {
  req.route = router.match(req.url)
  if (!req.route) return this.error(res, 404)
  req.route.fn.call(this, req, res)
}

Cat.prototype.changes = function(req, res) {
  var me = this
  this.catdb.db.iterator(function(err, iterator) {
    if (err) return me.error(res, 500, err)
    res.setHeader('content-type', 'application/json')
    var parsedURL = url.parse(req.url)
    if (parsedURL.query) query = qs.parse(parsedURL.query)
    else query = {since: "0"}
    var pre = '{"rows": [', sep = "", post = ']}'
    res.write(pre)
    me._getLast(function(err, last) {
      if (err) return me.error(res, 500, err)
      iterator.forRange(query.since, last, function(err, key, val) {
        if (key === last) return res.end(post)
        if (key === query.since) return
        res.write(sep + val)
        sep = ","
      })
    })
  })
}

// hack until node-leveldb gets streams
Cat.prototype._getLast = function(cb) {
  this.catdb.db.iterator(function(err, iterator) {
    if (err) return cb(err)
    iterator.last(function(err) {
      if (err) return cb(err)
      iterator.current(function(err, key, val) {
        cb(err, key)
      })
    })
  })
}

Cat.prototype.error = function(res, status, message) {
  res.statusCode = status || 500
  var json = {error: res.statusCode, message: message}
  this.json(res, json)
}

Cat.prototype.hello = function(req, res) {
  if (req.method === "POST") return this.document(req, res)
  this.json(res, {"cat": "Welcome", "version": 1})
}

Cat.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json))
}

Cat.prototype.document = function(req, res) {
  var me = this
  if (req.method === "GET") return this.catdb.get(req.route.params.id, function(err, json) {
    if (err) return me.error(res, 500)
    if (json === null) return me.error(res, 404)
    me.json(res, json)
  })
  if (req.method === "POST") return this.catdb.put(req, function(err, json) {
    if (err) return me.error(res, 500)
    me.json(res, json)
  })
  
}

var cat = new Cat('test', function(err, server) {
  server.listen(8000)
  console.log('8000')
})