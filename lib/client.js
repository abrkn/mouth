var Client = module.exports = function(socket) {
	this.socket = socket;
	this.player = null;
	this.subscriptions = [];
};