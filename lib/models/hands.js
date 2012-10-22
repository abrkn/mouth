var Backbone = require('backbone')
, Hand = require('./hand');

module.exports = Backbone.Collection.extend({
	model: Hand
});