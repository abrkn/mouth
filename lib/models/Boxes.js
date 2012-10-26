var Backbone = require('backbone')
, Box = require('./Box');

module.exports = Backbone.Collection.extend({
	model: Box,
	byIndex: function(index) {
		return this.find(function(box) { return box.get('index') == index; })
	}
});