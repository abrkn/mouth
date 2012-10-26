var expect = require('expect.js')
, Queue = require('../../lib/client/Queue.js');

describe('Queue', function() {
	it('should run sequentially', function(done) {
		var queue = new Queue;
		var items = [];

		queue(function(callback) {
			items.push(1);

			setTimeout(function() {
				items.push(2);
				callback();
			}, 1);
		});

		queue(function(callback) {
			items.push(3)
		});

		setTimeout(function() {
			expect(items).to.eql([1, 2, 3]);
			done();
		}, 50);
	});
});