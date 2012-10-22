var Backbone = require('backbone')
, Cards = require('./cards');

App.Hand = Backbone.Model.extend({
	parse: function(resp, xhr) {
		resp.cards = new App.Cards(resp.cards, { parse: true });
		return resp;
	}
});

