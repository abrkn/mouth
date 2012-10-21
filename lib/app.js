var express = require('express')
, app = express()
, mongoose = require('mongoose')
, Schema = mongoose.Schema
, bcrypt = require('bcrypt')
, _ = require('underscore');
//, MongoStore = require('connect-mongo')(express)
//, db = 'mongodb://mouth:password@alex.mongohq.com:10077/mouth';

//mongoose.connect(db);

//app.use(express.cookieParser());
//app.use(express.bodyParser());
/*app.use(express.session({ 
	secret: 'mouth', 
	cookie: { httpOnly:false },
 	store: new MongoStore({ mongoose_connection: mongoose.connections[0] })
}));*/

/*require('./routes/auth.js')(app);
require('./routes/user.js')(app);
require('./routes/game.js')(app);*/

app.get('/lib/blackjack.js', function (req, res) {
  res.sendfile(__dirname + '/blackjack.js');
});

app.use('/', express.static(require('path').join(__dirname, '../public')));

/*mongoose.connection.on('open', function() {
	app.listen(process.env.PORT || 3001);
});*/

process.env.DEBUG = '.*';
var server = require('http').createServer(app);
var io = require('socket.io').listen(server, { log: false });
server.listen(process.env.PORT || 3007);

var site = new (require('./site'));
var Client = require('./client');
var debug = require('debug')('app');
var Table = require('./table');

site.tables.push(new Table);

io.sockets.on('connection', function(socket) {
	site.connect(new Client(socket));
});