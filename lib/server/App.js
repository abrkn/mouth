var express = require('express')
, path = require('path')
, fs = require('fs')
, _ = require('underscore')
, async = require('async')
, blackjack = require('../blackjack')
, Models = require('../models')
, Client = require('./Client')
, secrets = require('../secrets')
, Site = require('./Site');

module.exports = function(server) {
	var debug = require('debug')('app');

	var site = new Site(new Models.Site({
		tables: [{
			id: 1,
			boxes: [
				{ index: 0 },
				{ index: 1 },
				{ index: 2 },
				{ index: 3 },
				{ index: 4 }
			]
		}]
	}, { parse: true }));

	var db = require('./app.db');
	
	var app = express();
	var sessionStore = new express.session.MemoryStore;
	var Session = require('connect').middleware.session.Session;

	app.use(express.cookieParser());
  	app.use(express.bodyParser());
  	app.use(express.session({ 
  		secret: secrets.session, 
  		store: sessionStore,
  		// allow client to know if he has a session
  		cookie: { httpOnly: false }
  	}));

  	server.on('request', app);
	require('./app.auth').configure(app);
	require('./app.assets').configure(app);
	var io = require('./app.io').configure(server);

	io.set('authorization', function(data, accept) {
		debug('authorization');

		if (!data.headers.cookie) {
			debug('socket is missing cookie');
			return accept('connect.sid cookie missing');
		}

		data.cookie = require('cookie').parse(data.headers.cookie);

		debug('client cookie parsed');

		data.sessionId = /^s\:(.{24})/.exec(data.cookie['connect.sid'])[1];

		debug('client session id', data.sessionId);

		debug('fetching session from store', data.sessionId);

		sessionStore.load(data.sessionId, function(err, session) {
			if (err) return accept(null, false);
			if (!session) return accept(null, false);

			data.session = new Session(data, session, sessionStore);

			debug('success of handshake!');

			accept(null, true);
		});
	});

	io.sockets.on('connection', function(socket) {
		var hs = socket.handshake;
    	debug('Socket connected with session', hs.sessionId);

    	if (!hs.session.passport.user) {
    		return socket.emit('not authenticated');
    	}

// TODO: Bugging
/*
    	var rereshTimer = setInterval(function() {
    		debug('reloading session');
    		hs.session.reload(function() {
    			debug('touching session');
    			hs.session.touch().save();
    		});
    	}, 60 * 1000);

	    socket.on('disconnect', function () {
	    	debug('socket disconnected, disabling refresh timer');
	        clearInterval(rereshTimer);
	    });
*/
	    var player = new Models.Player({
	    	id: hs.session.passport.user._id,
	    	name: hs.session.passport.user.name,
	    	balance: hs.session.passport.user.balance
	    });

		site.connect(new Client(socket, hs.session, player));
	});

	return server;
};