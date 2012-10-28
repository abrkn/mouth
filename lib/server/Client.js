var Backbone = require('backbone')
, _ = require('underscore');

module.exports = function(socket, session, player) {
	this.socket = socket;
	this.session = session;
	this.player = player;
	this.subscriptions = [];
};

_.extend(module.exports.prototype, {
});