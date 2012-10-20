var _ = require('underscore')
, debug = require('debug')('player');

var Player = module.exports = function(id) {
	this.clients = [];
	this.id = id;
};

_.extend(Player.prototype, {
	subscribe: function(name, fn) {
		debug('subscribing to', name);

		_.each(this.clients, function(client) {
			client.socket.on(name, fn);
		});

		this.subscriptions.push({ name: name, fn: fn });
	},

	send: function(name, message) {
		debug('-->', name, message || '');

		_.each(this.clients, function(client) {
			client.socket.emit(name, message);
		});
	}
});