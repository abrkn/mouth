var Backbone = require('backbone')
, Box = require('./Box');

module.exports = Backbone.Collection.extend({
	model: Box
});