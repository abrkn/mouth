var assets = require('./assets')
, path = require('path')
, _ = require('underscore')
, express = require('express')
, async = require('async')
, fs = require('fs');

module.exports = {
	configure: function(app) {
		app.get('/scripts.js', function(req, res, next) {
			var scripts = [
				{ path: 'vendor/jquery-1.8.2.min.js' },
				{ path: 'vendor/jquery.cookie.js' },
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
	}
};