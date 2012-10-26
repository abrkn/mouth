var _ = require('underscore');

module.exports = function(socket, room, queue) {
	this.socket = socket;
	this.room = room;
	this.queue = queue;
};

_.extend(module.exports.prototype, {
	on: function(name, callback) {
		this.socket.on(this.room + ':' + name, _.wrap(callback, function(callback) {
			this.queue(function() {
				callback.apply(this, _.toArray().splice(1));
			});
		}));
	},
	emit: function(name, callback) {
		this.socket.emit(this.room + ':' + name, callback);
	}
});