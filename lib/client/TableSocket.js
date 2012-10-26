var _ = require('underscore');

module.exports = function(socket, room, queue) {
	_.bindAll(this);
	this.socket = socket;
	this.room = room;
	this.queue = queue;
};

_.extend(module.exports.prototype, {
	on: function(name, fn) {
		this.socket.on(this.room + ':' + name, _.bind(function() {
			var args = _.toArray(arguments);
			this.queue(function(callback) {
				args.push(callback);
				fn.apply(this, args);
			});
		}, this));
	},
	emit: function(name, callback) {
		this.socket.emit(this.room + ':' + name, callback);
	}
});