var _ = require('underscore')
, debug = require('debug')('site')
, Models = require('../models')
, Player = require('./Player')
, Table = require('./Table')
, util = require('util');

var Site = module.exports = function(model) {
	_.bindAll(this);
	this.model = model;
	this.clients = [];

	this.players = this.model.get('players').reduce(function(memo, item) { memo[item.get('id')] = new Player(item); return memo; }, {});
	this.tables = _.map(this.model.get('tables').models, function(table) { return new Table(table); });
};

_.extend(Site.prototype, {
	sendTables: function(client) {
		client.socket.emit('tables', _.map(this.tables, function(table) {
			return { id: table.model.id };
		}));
	},

	onJoin: function(client, tableId) {
		debug('client', client.socket.id, 'joining table', tableId);
		var table = _.find(this.tables, function(table) { return table.model.id === tableId; });
		if (!table) return client.socket.emit('error', 'join failed, table does not exist');
		if (~table.clients.indexOf(client)) return client.socket.emit('error', 'join: already in table');
		client.socket.emit('join', table.catchup());
		table.add(client);
	},

	onAuth: function(client, pid, callback) {
		debug('client authenticating as', pid);

		var player = this.players[pid];

		if (!player) {
			return debug('not implemented: player lookup');
		}

		client.player = player;
		client.socket.on('join', _.bind(this.onJoin, this, client));

		this.sendTables(client);

		callback(_.pick(player.model.attributes, 'id', 'name', 'balance'));
	},

	connect: function(client) {
		client.socket.once('auth', _.bind(this.onAuth, this, client));
	}
});