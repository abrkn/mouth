var Backbone = require('backbone')
, Card = require('./Card')
, blackjack = require('../blackjack')
, _ = require('underscore');

module.exports = Backbone.Collection.extend({
	model: Card,
	plain: function() {
		return this.map(function(card) { return card.get('value') });
	},
	score: function() {
		return blackjack.score(this.plain());
	},
	sum: function() {
		return blackjack.sum(this.plain());
	},
	pretty: function() {
		return this.length ? blackjack.pretty(this.plain()) : '(empty)';
	}
});