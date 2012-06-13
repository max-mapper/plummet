var name = process.argv[2] || 'test'
var port = process.argv[3] || 8000

var plummet = require('./index')

plummet(name, function(err, server) {
  server.listen(port)
  console.log(name, port)
})