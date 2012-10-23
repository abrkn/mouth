var Backbone = require('backbone')
, Boxes = require('./Boxes')
, Cards = require('./Cards')
, _ = require('underscore')
, Players = require('./Players');

module.exports = Backbone.Model.extend({
	defaults: {
		rules: null,
		state: 'betting',
		deck: null,
		turn: null,
		dealer: null,
		boxes: new Boxes,
		players: new Players
	},
	initialize: function() {
	},
	parse: function(resp, xhr) {
		resp = _.clone(resp);
		resp.boxes = new Boxes(resp.boxes, { parse: true });
		resp.players = new Players(resp.players, { parse: true });
		resp.dealer = new Cards(resp.dealer, { parse: true });
		resp.deck = new Cards(resp.deck, { parse: true });
		return resp;
	},
	toJSON: function() {
		var result = Backbone.Model.prototype.toJSON.call(this);
		result.dealer = result.dealer ? result.dealer.toJSON() : null;
		result.boxes = result.boxes ? result.boxes.toJSON() : null;
		result.players = result.players ? result.players.toJSON() : null;
		result.deck = result.deck ? result.deck.toJSON() : null;
		return result;
	}
});