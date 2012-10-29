var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
	idAttribute: '_id',
	defaults: function() {
		return {
			balance: null
		};
	}
});