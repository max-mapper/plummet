var plummet = require('./index')

plummet('test', function(err, server) {
  server.listen(8000)
  console.log('8000')
})