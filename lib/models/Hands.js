var Backbone = require('backbone')
, Hand = require('./Hand');

module.exports = Backbone.Collection.extend({
	model: Hand,
	byIndex: function(index) {
		return this.find(function(hand) { return hand.get('index') == index; })
	}
});