var Backbone = require('backbone')
, Cards = require('./Cards');

module.exports = Backbone.Model.extend({
	defaults: function() {
		return {
			cards: new Cards,
			insurance: 0,
			doubled: 0,
			bet: null
		};
	},
	parse: function(resp, xhr) {
		resp.cards = new Cards(resp.cards, { parse: true });
		return resp;
	},
	toJSON: function() {
		var result = Backbone.Model.prototype.toJSON.call(this);
		result.cards = result.cards.toJSON();
		return result;
	}
});