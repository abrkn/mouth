var _ = require('underscore')
, debug = require('debug')('site')
, Models = require('../models')
, Player = require('./Player')
, Table = require('./Table')
, util = require('util')
, db = require('./app.db');

var Site = module.exports = function(model) {
	_.bindAll(this);
	this.model = model;
	this.clients = [];
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

	connect: function(client) {
		client.socket.emit('profile', _.pick(client.player.attributes, 'id', 'name', 'balance'));
		client.socket.on('join', _.bind(this.onJoin, this, client));
		this.sendTables(client);
	}
});