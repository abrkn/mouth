var _ = require('underscore')
, debug = require('debug')('site');

var Site = module.exports = function() {
	this.clients = [];
	this.tables = [];
	this.players = {};
};

var Player = require('./player');
var players = {};

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
		client.socket.once('auth', _.bind(function(pid, cb) {
			debug('client authenticating as', pid);
			client.player = players[pid] || (players[pid] = new Player(pid));
			client.socket.on('join', _.bind(this.join, this, client));
			cb();
			this.sendTables(client);
		}, this));
	}
});