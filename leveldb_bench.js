// output from my macbook air:
//  put 1000 took 17ms
//  put 10000 took 161ms
//  put 100000 took 1846ms
//  put 1000000 took 23812ms
//  batch 1000 took 4ms
//  batch 10000 took 49ms
//  batch 100000 took 399ms
//  batch 1000000 took 5583ms

var leveldb = require('leveldb')

function put(num, cb) {
  leveldb.open("test.leveldb", { create_if_missing: true }, function(err, db) {
    var start = new Date()
    var done = 0
    for (var i = num; i > 1; --i) {
      db.put('hello', 'world', function(err) {
        done++
        if (done + 1 === num) finish()
      })
    }
  
    function finish() {
      console.log('put ' + num + ' took ' + (new Date() - start) + "ms")
      leveldb.destroy("test.leveldb", function(err) {
        cb(err)
      })
    }
  })
}

function batch(num, cb) {
  leveldb.open("test.leveldb", { create_if_missing: true }, function(err, db) {
    var start = new Date()
    var batch = db.batch()
    for (var i = num; i > 1; --i) {
      batch.put('hello', 'world')
    }
    batch.write(finish)
  
    function finish() {
      console.log('batch ' + num + ' took ' + (new Date() - start) + "ms")
      leveldb.destroy("test.leveldb", function(err) {
        cb(err)
      })
    }
  })
}


put(1000, function(err) {
  put(10000, function(err) {
    put(100000, function(err) {
      put(1000000, function(err) {
        batch(1000, function(err) {
          batch(10000, function(err) {
            batch(100000, function(err) {
              batch(1000000, function(err) {

              })
            })
          })
        })
      })
    })
  })
})
