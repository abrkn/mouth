var xassets = {
	'bootstrap js': { path: 'vendor/bootstrap/js/bootstrap.min.js' },
	'jquery': { path: 'vendor/jquery-1.8.2.min.js' },
	'bootstrap css': { path: 'vendor/bootstrap/css/bootstrap.min.css' },
	'styles': { path: 'less/styles.less' },
	'browserify': { type: 'browserify' }
};

var less = require('less')
, path = require('path')
, fs = require('fs')
, browserify = require('browserify')
, assert = require('assert');

var assets = module.exports = {
	load: function(asset, callback) {
		var type = asset.type || (asset.path && asset.path.match(/\.([^\.]+)$/)[1]);
		assets[type](asset, callback);
	},

	raw: function(asset, callback) {
		callback(null, asset.content);
	},

	file: function(asset, callback) {
		var p = path.join(__dirname, '../..', 'assets/', asset.path);
		fs.readFile(p, 'utf8', callback);
	},

	css: function(asset, callback) {
		assets.file(asset, callback);
	},

	browserify: function(asset, callback) {
		var b = browserify(asset.path);
		assert(callback);
		callback(null, b.bundle());
	},

	js: function(asset, callback) {
		assets.file(asset, callback);
	},

	less: function(asset, callback) {
		assets.file(asset, function(err, res) {
			if (err) return callback(err);
			less.render(res, callback);
		});
	}
};