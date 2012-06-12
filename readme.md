a http + json api for leveldb that syncs


    var plummet = new Plummet('test', function(err, server) {
      server.listen(8000)
      console.log('plummeting on 8000')
    })


    curl -X POST http://localhost:8000 -H "Content-type: application/json" -d '{"pizza":"waffle"}'
    curl -X POST http://localhost:8000/_bulk -d '{"docs":[{"hello":"world"}, {"foo":"bar"}]}' -H "Content-type: application/json"
    curl http://localhost:8000/_changes
