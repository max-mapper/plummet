var it = require('it-is')
var request = require('request').defaults({json: true})
var plummet = require('./index')
var testserver = 'http://localhost:8000/'
var async = require('async')
var _ = require('underscore')

function setup(cb) {
  var instance = plummet('test', function(err, server) {
    server.listen(8000)
    cb(err, server, instance)
  })
}

function teardown(server, instance, cb) {
  server.on('close', function() {
    server = null
    instance.plumbdb.destroy(cb)
  })
  server.close()
}

function assert(test) {
  return function(cb) {
    setup(function(err, server, instance) {
      function done(result) {
        teardown(server, instance, function(destroyErr) {
          if (destroyErr) console.log("Destroy Error", destroyErr)
          cb(false, result)
        })
      }
      try {
        test(server, done)
      } catch(e) {
        done(e)
      }
    })
  }
}

var tests = {
  running: assert(function(server, cb) {
    request(testserver, function(err, resp, json) {
      cb(json.version !== 1)
    })
  }),
  saveDoc: assert(function(server, cb) {
    request.post({url: testserver, json: {"hello": "world"}}, function(err, resp, json) {
      cb(!(json._rev && json._id))
    })
  }),
  updateDoc: assert(function(server, cb) {
    request.post({url: testserver, json: {"hello": "world"}}, function(err, resp, json) {
      request.post({url: testserver, json: json}, function(err, resp, updated) {
        cb(!(resp.statusCode < 299) && updated._rev[0] === '2')
      })
    })
  }),
  saveBulk: assert(function(server, cb) {
    var docs = []
    _.times(1000, function() { docs.push({"pizza":"cats"}) })
    request.post({url: testserver + '_bulk', json: {"docs": docs}}, function(err, resp, json) {
      var error = false
      _.each(json.results, function(r) { if (!r._id || !r._rev || !r._stamp) error = 'invalid response doc' })
      if (json.results.length !== 1000) error = 'invalid response length'
      cb(error)
    })
  }),
  emptyChanges: assert(function(server, cb) {
    request(testserver + '_changes', function(err, resp, json) {
      cb(json.docs.length !== 0)
    })
  }),
  changes: assert(function(server, cb) {
    request.post({url: testserver, json: {"hello": "world"}}, function(err, resp, json) {
      request(testserver + '_changes', function(err, resp, json) {
        cb(json.docs.length !== 1)
      })
    })
  }),
  changesDuplicates: assert(function(server, cb) {
    request.post({url: testserver, json: {"hello": "world"}}, function(err, resp, json) {
      json.foo = "bar"
      request.post({url: testserver, json: json}, function(err, resp, edited) {
        request(testserver + '_changes', function(err, resp, json) {
          cb(json.docs.length !== 1 || JSON.stringify(json.docs[0]) !== JSON.stringify(edited))
        })
      })
    })
  }),
  replicate: assert(function(server, cb) {
    var docs = []
    _.times(1000, function() { docs.push({"pizza":"cats"}) })
    request.post({url: testserver + '_bulk', json: {"docs": docs}}, function(err, resp, json) {
      var results = json.results
      var target = plummet('testtarget', function(err, targetServer) {
        targetServer.listen(8001)
        request.post({url: 'http://localhost:8001/_pull', json: {"source": testserver}}, function(err, resp, reply) {
          teardown(targetServer, target, function(err) {
            cb(JSON.stringify(reply.results) !== JSON.stringify(results))
          })
        })
      })
    })
  })
}

console.log('running tests...')
async.series(tests, function(err, results) {
  _.each(results, function(result, test) {
    console.log(test, result ? 'FAIL ' + result : 'PASS')
  })
})