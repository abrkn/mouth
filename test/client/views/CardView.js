var _ = require('underscore');
var CardView = require('../../../lib/client/views/CardView.js');

describe('CardView', function() {
	describe('appear', function() {
		it('can appear with animation', function(done) {
			var target = new CardView({ el: $('<div>') });
			target.appear(true, done);
		});
	});
});