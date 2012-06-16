streaming + syncing http + json api for [PlumbDB](https://github.com/maxogden/plumbdb) (which is built on leveldb)

    npm install plummet

    var plummet = require('plummet')
    
    plummet('test', function(err, server) {
      server.listen(8000)
      console.log('plummeting on 8000')
    })


    curl -X POST http://localhost:8000 -H "Content-type: application/json" -d '{"pizza":"waffle"}'
    curl -X POST http://localhost:8000/_bulk -d '{"docs":[{"hello":"world"}, {"foo":"bar"}]}' -H "Content-type: application/json"
    curl http://localhost:8000/_changes
    curl http://localhost:8000/_changes?since=1339537769596014
    curl http://localhost:8000/1339537769596014
    curl -X POST http://localhost:8000/_pull -d '{"source":"http://remoteplummet"}' -H 'content-type: application/json'
    
