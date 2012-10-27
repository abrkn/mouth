var _ = require('underscore');
var HandView = require('../../../lib/client/views/HandView.js');
var Models = require('../../../lib/models');

describe('Handiew', function() {
	describe('render', function() {
		it('should render cards', function() {
			var hand = new Models.Hand({
				index: 0,
				splits: 0,
				cards: [
					{ value: 1 },
					{ value: 2 },
				]
			}, { parse: true });

			var handView = new HandView({ model: hand });
			handView.render();

			expect(handView.$el.find('>.card').length).to.be(2);
		});
	});
});