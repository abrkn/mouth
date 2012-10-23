var Backbone = require('backbone')
, Tables = require('./Tables')
, Players = require('./Players');

module.exports = Backbone.Model.extend({
	defaults: function() {
		return {
			tables: new Tables,
			players: new Players
		};
	},
	parse: function(resp, xhr) {
		resp.players = new Players(resp.players, { parse: true });
		resp.tables = new Tables(resp.tables, { parse: true });
		return resp;
	}	
});