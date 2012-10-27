var express = require('express')
, path = require('path')
, fs = require('fs')
, _ = require('underscore')
, async = require('async')
, blackjack = require('../blackjack')
, assets = require('./assets');

module.exports = function(app) {
	var pages = {};
	process.env.DEBUG = '.*';
	var debug = require('debug')('app');

	app.get('/scripts.js', function(req, res, next) {
		var scripts = [
			{ path: 'vendor/jquery-1.8.2.min.js' },
			{ type: 'browserify', path: 'lib/client/entry.js' }
		];
		async.map(scripts, assets.load, function(err, srcs) {
			if (err) return next(err);
			res.end(_.reduce(srcs, function(a, b) { return a + b }));
		});
	});

	app.get('/styles.css', function(req, res, next) {
		var styles = [
			{ path: 'vendor/bootstrap/css/bootstrap.css' },
			{ path: 'vendor/bootstrap/css/bootstrap-responsive.css' },
			{ path: 'less/styles.less' }
		];
		async.map(styles, assets.load, function(err, styles) {
			if (err) return next(err);
			res.end(_.reduce(styles, function(a, b) { return a + b }));
		});
	});

	app.get(/\/($|\?)/, function(req, res, next) {
		fs.readFile(path.join(__dirname, '../../assets/index.html'), 'utf8', function(err, r) {
			if (err) return next(err);
			res.end(r);
		});
	});

	app.use('/media', express.static(path.join(__dirname, '../../assets/media')));

	var server = require('http').createServer(app)
	, ioConfig = { log: false };
	if (process.env.PORT) {
		_.extend(ioConfig, {
			'transports': process.env.PORT ? ['xhr-polling'] : undefined,
			'polling duration': 10
		});
	}

	var io = require('socket.io').listen(server, ioConfig);
	server.listen(process.env.PORT || 3007);

	var Models = require('../models');

	var Client = require('./Client');

	var player1 = new Models.Player({
		id: 1,
		name: 'one',
		balance: 100 * 1000
	}, { parse: true });

	var player2 = new Models.Player({
		id: 2,
		name: 'two',
		balance: 500 * 1000
	}, { parse: true });

	/*
	var siteModel = new Models.Site({
		players: [player1, player2],
		tables: [{
			id: 1,
			state: 'playing',
			dealer: [{ value: 2 }, { value: 4 }],
			turn: [3, 0],
			deck: _.map([1], function(c) { return { value: c }; }),
			boxes: [
				{ index: 0 },
				{ index: 1 },
				{ index: 2 },
				{ index: 3, player: {id:1,name:'one'}, hands: [{ index: 0, cards: [{value:5},{value:5+13}], bet: 500 }] },
				{ index: 4, player: {id:1,name:'one'}, hands: [{ index: 0, cards: [{value:3},{value:6}], bet: 500 }] },
			]
		}]
	}, { parse: true });
	*/
	var siteModel = new Models.Site({
		players: [player1, player2],
		tables: [{
			id: 1,
			state: 'betting',
			dealer: [],
			turn: null,
			deck: [],
			boxes: [
				{ index: 0 },
				{ index: 1 },
				{ index: 2 },
				{ index: 3 },
				{ index: 4 },
			]
		}]
	}, { parse: true });

	var site = new (require('./Site'))(siteModel);

	io.sockets.on('connection', function(socket) {
		site.connect(new Client(socket));
	});
}