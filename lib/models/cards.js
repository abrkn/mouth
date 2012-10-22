var Backbone = require('backbone')
, Card = require('./card')
, blacjack = require('../blackjack');

module.exports = Backbone.Collection.extend({
	model: Card,
	plain: function() {
		return this.map(function(card) { return card.attributes.value });
	},
	pretty: function() {
		return this.length ? blackjack.pretty(this.plain()) : '(empty)';
	}
});