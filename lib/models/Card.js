var Backbone = require('backbone')
, blackjack = require('../blackjack');

module.exports = Backbone.Model.extend({
	pretty: function() {
		return blackjack.pretty(this.get('value'));
	}
});