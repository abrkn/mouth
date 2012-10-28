process.env.DEBUG = '.*';

var server = require('http').createServer();
var app = require('../lib/server/App')(server);

server.listen(process.env.PORT || 4010);