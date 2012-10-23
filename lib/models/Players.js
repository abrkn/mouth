var Backbone = require('backbone')
, Player = require('./Player');

module.exports = Backbone.Collection.extend({
	model: Player
});