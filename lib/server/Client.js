var Backbone = require('backbone')
, _ = require('underscore');

module.exports = function(socket) {
	this.socket = socket;
	/*this.socket.emit = _.wrap(this.socket.emit, function(fn, name) {
		console.log.apply(this, ['-->', socket.id].concat(_.toArray(arguments).slice(1)));
		return fn.apply(this, _.toArray(arguments).slice(1));
	});*/

	this.subscriptions = [];
	this.player = null;
};

_.extend(module.exports.prototype, {
});