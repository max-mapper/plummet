// output from my macbook air:
//  POST /_bulk
//  1000 docs in 177ms
//  POST /_bulk
//  10000 docs in 1611ms
//  POST /_bulk
//  100000 docs in 22474ms
//  POST /_bulk
//  1000000 docs in 125862ms

var request = require('request')
var _ = require('underscore')
var plummet = require('./')
var h = {"Content-type": "application/json", "Accept": "application/json"}

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
  
function bulk(size, cb) {
  var docs = []
  _.times(size, function(){ docs.push({"pizza":"cats"}) })
  docs = JSON.stringify({"docs": docs});
  var start = new Date();
  request({url: "http://localhost:8000/_bulk", method: "POST", body: docs, headers: h}, function(err, resp, body) {
    console.log(size + " docs in " + (new Date() - start) + "ms");
    cb()
  })
}

function run(num, cb) {
  setup(function(err, server, instance) {
    function done() {
      teardown(server, instance, function(destroyErr) {
        if (destroyErr) console.log("Destroy Error", destroyErr)
        cb()
      })
    }
    bulk(num, done)
  })
}

run(1000, function(){
  run(10000, function(){
    run(100000, function(){
      run(1000000, function(){

      })
    })
  })
})
