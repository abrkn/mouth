var Backbone = require('backbone')
, Box = require('./box');

module.exports = Backbone.Collection.extend({
	model: Box
});