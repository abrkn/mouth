App.Hand = Backbone.Model.extend({
	parse: function(resp, xhr) {
		console.log('parsing hand model', _.clone(resp));
		resp.cards = new App.Cards(resp.cards, { parse: true });
		return resp;
	}
});

App.Hands = Backbone.Collection.extend({
	model: App.Hand
});