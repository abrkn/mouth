App.Card = Backbone.Model.extend({
	pretty: function() {
		return blackjack.pretty(this.get('value'));
	}
});

App.Cards = Backbone.Collection.extend({
	model: App.Card,
	parse: function(resp, xhr) {
		console.log('cards to parse', resp);
	},
	plain: function() {
		return this.map(function(card) { return card.attributes.value });
	},
	pretty: function() {
		return this.length ? blackjack.pretty(this.plain()) : '(empty)';
	}
});