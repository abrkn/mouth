var Backbone = require('backbone')
, Hands = require('./Hands')
, Player = require('./Player');

module.exports = Backbone.Model.extend({
	defaults: function() {
		return {
			player: null,
			bet: null,
			hands: new Hands,
			splits: null
		}
	},
	parse: function(resp, xhr) {
		resp.hands = resp.hands ? new Hands(resp.hands, { parse: true }) : new Hands;
		resp.player = resp.player ? new Player(resp.player, { parse: true }) : null;
		return resp;
	},
	toJSON: function() {
		var result = Backbone.Model.prototype.toJSON.call(this);
		result.hands = result.hands.toJSON();
		result.player = result.player ? result.player.toJSON() : null;
		return result;
	}
});