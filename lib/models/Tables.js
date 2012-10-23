var Backbone = require('backbone')
, Table = require('./Table');

module.exports = Backbone.Collection.extend({
	model: Table
});