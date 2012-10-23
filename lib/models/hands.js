var Backbone = require('backbone')
, Hand = require('./Hand');

module.exports = Backbone.Collection.extend({
	model: Hand
});