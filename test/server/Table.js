var expect = require('expect.js')
, blackjack  = require('../../lib/blackjack')
, Table = require('../../lib/server/Table.js')
_ = require('underscore')
, TableModel = require('../../lib/models/Table.js');

function hand(cards) {
	return _.map(blackjack.hand(cards), function(x) { return { value: x }; });
}

describe('Table', function() {
	describe('getNextTurn', function() {
		it('should skip hands with 21', function() {
			var model = new TableModel({
				boxes: [{
					index: 0, 
					hands: [{
						index: 0,
						cards: hand('as ts'),
						bet: 100
					}]
				}, {
					index: 1, 
					hands: [{
						index: 0,
						cards: hand('9s 8s'),
						bet: 100
					}]
				}],
				state: 'playing',
				turn: null
			}, { parse: true });

			var table = new Table(model);

			expect(table.getNextTurn(model.get('turn'))).to.eql([1, 0]);
		});

		it('should not skip hands with 20', function() {
			var model = new TableModel({
				boxes: [{
					index: 0, 
					hands: [{
						index: 0,
						cards: hand('td kh'), 
						bet: 100
					}]
				}, {
					index: 1, 
					hands: [{
						index: 0,
						cards: hand('td th'), 
						bet: 100
					}]
				}],
				state: 'playing',
				turn: null
			}, { parse: true });

			var table = new Table(model);

			expect(table.getNextTurn(model.get('turn'))).to.eql([0, 0]);
		});
	});
});