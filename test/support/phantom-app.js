var assets = require('../../lib/server/assets')
, path = require('path')
, express = require('express')
, fs = require('fs')
, _ = require('underscore')
, async = require('async');

module.exports = function(app) {
	app.get('/tests.js', function(req, res, next) {
		var tests = [
			{ path: 'vendor/jquery-1.8.2.min.js' },
			{ path: '../node_modules/mocha/mocha.js' },
			// causes "describe" to become defined by mocha
			{ type: 'raw', content: 'mocha.setup("bdd");' },
			{ type: 'browserify', path: 'test/client/index.js' }
		];
		async.map(tests, assets.load, function(err, srcs) {
			if (err) return next(err);
			res.end(_.reduce(srcs, function(a, b) { return a + b }));
		});
	});

	app.get('/styles.css', function(req, res, next) {
		var styles = [
			{ path: '../node_modules/mocha/mocha.css' },
			{ path: 'less/styles.less' }
		];
		async.map(styles, assets.load, function(err, styles) {
			if (err) return next(err);
			res.end(_.reduce(styles, function(a, b) { return a + b }));
		});
	});

	app.get('/', function(req, res, next) {
		fs.readFile(path.join(__dirname, 'test.html'), 'utf8', function(err, html) {
			err ? next(err) : res.end(html);
		});
	});

	return app;
};