var express = require('express')
, app = express()
, path = require('path')
, fs = require('fs')
, _ = require('underscore')
, less = require('less')
, async = require('async')
, blackjack = require('../blackjack');
process.env.DEBUG = '.*';
var debug = require('debug')('app');
var pages = {};

var assets = {
	'bootstrap js': { path: 'vendor/bootstrap/js/bootstrap.min.js' },
	'jquery': { path: 'vendor/jquery-1.8.2.min.js' },
	'bootstrap css': { path: 'vendor/bootstrap/css/bootstrap.min.css' },
	'styles': { path: 'less/styles.less' },
	'browserify': { type: 'browserify' }
};

debug('loading assets');

async.forEach(_.toArray(assets), function(asset, callback) {
	debug('loading asset', asset);

	var type = asset.type || asset.path.match(/\.([^\.]+)$/)[1];
	var source = asset.path ? fs.readFileSync(path.join(__dirname, '../../assets/', asset.path), 'utf8') : null;
	asset.content = null;

	callback = _.wrap(callback, function(callback) {
		debug(type, 'asset', 'loaded', asset.content.length, 'bytes');
		callback();
	});

	var prepareLess = function() {
		less.render(source, function(e, css) {
			if (e) return callback(e);
			source = css;
			prepareCss();
		});
	};

	var prepareCss = function() {
		asset.content = '<style>' + source + '</style>';
		debug('css', asset.name, 'loaded', asset.content.length, 'bytes');
		callback();
	};

	var prepareJs = function() {
		asset.content = '<script>' + source + '</script>';
		callback();
	};

	var prepareBrowserify = function() {
		var browserify = (require('browserify'))(path.join(__dirname, '../client/App.js'));
		source = browserify.bundle();
		prepareJs();
	};

	if (type == 'js') prepareJs();
	else if (type == 'less') prepareLess();
	else if (type == 'css') prepareCss();
	else if (type == 'browserify') prepareBrowserify();
	else throw new Error('unknown asset type ' + type);
}, function(e) {
	if (e) throw e;

	debug(_.size(assets), 'assets loaded')

	var templates = _.map(['index.html', 'test.html'], function(filename) {
		var source = fs.readFileSync(path.join(__dirname, '../../assets/' + filename), 'utf8');
		return { filename: filename, template: _.template(source) };
	});

	var vm = { assets: {} };
	_.each(assets, function(a, n) { vm.assets[n] = a.content; });

	_.each(templates, function(template) {
		pages[template.filename] = template.template(vm);
	});
});

app.use(function(req, res, next) {
	var page = pages[req.url.substr(1)];
	return page ? res.end(page) : next();
});
app.use('/media', express.static(path.join(__dirname, '../../assets/media')));

var server = require('http').createServer(app)
, ioconfig = { log: false };
if (process.env.PORT) {
	_.extend(ioConfig, {
		'transports': process.env.PORT ? ['xhr-polling'] : undefined,
		'polling duration': 10
	});
}

var io = require('socket.io').listen(server, ioconfig);
server.listen(process.env.PORT || 3007);

var Models = require('../models');

var Client = require('./Client');

var player1 = new Models.Player({
	id: 1,
	name: 'one'
}, { parse: true });

var siteModel = new Models.Site({
	players: [player1],
	tables: [{
		id: 1,
		state: 'betting',
		dealer: [],//[{ value: 2 }, { value: 4 }],
		turn: null,//[3, 0],
		deck: _.map(blackjack.deck().concat(blackjack.deck()), function(c) { return { value: c }; }),
		boxes: [
			{ index: 0 },
			{ index: 1 },
			{ index: 2 },
			{ index: 3, player: player1 },//, hands: [{ index: 0, cards: [{value:10},{value:11}], bet: 500 }] },
			{ index: 4 }
		]
	}]
}, { parse: true });

var site = new (require('./Site'))(siteModel);

io.sockets.on('connection', function(socket) {
	site.connect(new Client(socket));
});