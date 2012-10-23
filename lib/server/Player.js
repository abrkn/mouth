var _ = require('underscore')
, debug = require('debug')('player');

var Player = module.exports = function(model) {
	this.model = model;
	this.clients = [];
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
		_.each(this.clients, function(client) {
			client.socket.emit.apply(this, arguments);
		});
	}
});