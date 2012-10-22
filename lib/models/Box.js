var Backbone = require('backbone')
, Hands = require('./hands');

module.exports = Backbone.Model.extend({
	parse: function(resp, xhr) {
		resp.hands = resp.hands ? new Hands(resp.hands, { parse: true }) : new Hands;
		return resp;
	}
});