var _ = require('underscore')
, debug = require('debug')('site');

var Site = module.exports = function() {
	this.clients = [];
	this.tables = [];
	this.players = {};
};

var Player = require('./player');
var player;

_.extend(Site.prototype, {
	sendTables: function(client) {
		client.socket.emit('tables', _.map(this.tables, function(table) {
			return { id: table.id };
		}));
	},

	join: function(client, tableId) {
		var table = _.where(this.tables, { id: tableId })[0];
		client.socket.emit('join', tableId);
		table.add(client);
	},

	connect: function(client) {
		// todo: auth
		var playerId = 1, player = this.players[playerId];

		if (!player) {
			// todo: retrieve
			player = this.players[playerId] = new Player(playerId);
		}

		client.player = player;

		client.socket.on('join', _.bind(this.join, this, client));
		this.sendTables(client);
	}
});