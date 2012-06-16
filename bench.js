// benchmarks plummet
// usage: npm install request underscore && node bench.js http://localhost:8000 100000

var request = require('request')
  , _ = require('underscore')

var db = process.argv[2] || "http://localhost:8000"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  , docs = []
  , size = process.argv[3] || 10000
  ;
  
_.times(size, function(){ docs.push({"pizza":"cats"}) })

docs = JSON.stringify({"docs": docs});

var start = new Date();
console.log('bulk inserting documents...')
request({url: db + "/_bulk", method: "POST", body: docs, headers: h}, function(err, resp, body) {
  console.log(size + " docs in " + (new Date() - start) + "ms");
})
