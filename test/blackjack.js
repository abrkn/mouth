var expect = require('expect.js')
, blackjack = require('../lib/blackjack.js');

describe('blackjack', function() {
	describe('deck', function() {
		it('should have 52 cards', function() {
			var deck = blackjack.deck();
			expect(deck).to.have.length(52);
		});

		it('should be randomized every time', function() {
			var deck1 = blackjack.deck();
			var deck2 = blackjack.deck();

			expect(deck1).to.not.eql(deck2);
		});
	});

	describe('rank', function() {
		it('should wrap on 14', function() {
			expect(blackjack.rank(1)).to.be(1);
			expect(blackjack.rank(13 * 1 + 1)).to.be(1);
			expect(blackjack.rank(13 * 2 + 5)).to.be(5);
		});
	});

	describe('value', function() {
		it('should treat pictures as tens', function() {
			expect(blackjack.value(11)).to.be(10);
			expect(blackjack.value(10)).to.be(10);
			expect(blackjack.value(13)).to.be(10);
			expect(blackjack.value(1)).to.be(1);
		});
	});

	describe('values', function() {
		it('should get the value for each card in the hand', function() {
			expect(blackjack.values([1, 13 + 13])).to.eql([1, 10]);
		});
	});

	describe('sum', function() {
		it('should get the sum of the values in the hand', function() {
			expect(blackjack.sum([1, 14])).to.be(2);
		});
	});

	describe('isBlackjack', function() {
		it('should adhere to rules', function() {
			expect(blackjack.isBlackjack([1, 13])).to.be(true);
			expect(blackjack.isBlackjack([2, 4])).to.be(false);
			expect(blackjack.isBlackjack([14, 11])).to.be(true);
			expect(blackjack.isBlackjack([1, 4])).to.be(false);
			expect(blackjack.isBlackjack([1, 1, 9])).to.be(false);
		});
	});

	describe('isSoft', function() {
		it('should confirm examples', function() {
			expect(blackjack.isSoft([1, 1])).to.be(true); // 2/12
			expect(blackjack.isSoft([10, 4])).to.be(false); // 14
			expect(blackjack.isSoft([2, 3])).to.be(false); // 5
			expect(blackjack.isSoft([14, 13])).to.be(true); // 11/21
			expect(blackjack.isSoft([1, 1, 4])).to.be(true); // 6/16
			expect(blackjack.isSoft([10, 1, 1])).to.be(false); // 12
			expect(blackjack.isSoft([1, 1, 1, 1, 1, 1, 1])).to.be(true); // 7/17
			expect(blackjack.isSoft([5, 1, 5])).to.be(true); // 11/21
		});
	});

	describe('hand', function() {
		it('should parse normal format', function() {
			var hand = blackjack.hand('as 3h ad 7c');
			expect(hand).to.eql([13*3+1, 3, 13+1, 13*2+7]);
		});
	});

	describe('card', function() {
		it('should understand normal notation', function() {
			var card = blackjack.card('as');
			expect(card).to.be(13 * 3 + 1);

			card = blackjack.card('KH');
			expect(card).to.be(13);

			card = blackjack.card('ah');
			expect(card).to.be(1);

			card = blackjack.card('td');
			expect(card).to.be(13 * 1 + 10);
		});
	});

	describe('deal', function() {
		it('should let player blackjacks win', function() {
			var deck = blackjack.deck;
			blackjack.deck = function() { return blackjack.hand('7c 7d ah jc').reverse(); };

		 	var box = blackjack.deal(10);
			expect(box.outcome).to.be(10 * 2.5);

			blackjack.deck = deck;
		});

		it('should not pay bj when dealer shows ace', function() {
			var deck = blackjack.deck;
			blackjack.deck = function() { return blackjack.hand('ac 2d ah jc').reverse(); };

		 	var box = blackjack.deal(10);
			expect(box.outcome).to.be(undefined);
			expect(box.hands[0]).to.eql(blackjack.hand('ah jc'));
			expect(box.dealer).to.eql(blackjack.hand('ac 2d'));

			blackjack.deck = deck;
		});

		it('should push on blackjacks', function() {
			var deck = blackjack.deck;
			blackjack.deck = function() { return blackjack.hand('qd ah kh ac').reverse(); };

		 	var box = blackjack.deal(20);

			expect(box.outcome).to.be(20);
			expect(box.dealer).to.eql(blackjack.hand('qd ah'));
			expect(box.hands[0]).to.eql(blackjack.hand('kh ac'));

			blackjack.deck = deck;
		});
	});

	describe('hit', function() {
		it('should not be possible on a bust hand', function() {
			var box = {
				dealer: blackjack.hand('td th'),
				hands: [blackjack.hand('7d 8d 7h')],
				deck: blackjack.hand('')
			};

			expect(function() { blackjack.hit(box); }).to.throwError();
		});

		it('should not be possible on a complete game', function() {
			// player stood on 15 and lost
			var box = {
				dealer: blackjack.hand('td th'),
				hands: [blackjack.hand('7d 8d')],
				deck: blackjack.hand(''),
				outcome: 0
			};

			expect(function() { blackjack.hit(box); }).to.throwError();
		});

		it('should not be possible on a complete game', function() {
			// player stood on 15 and lost
			var box = {
				dealer: blackjack.hand('td th'),
				hands: [blackjack.hand('7d 8d')],
				deck: blackjack.hand(''),
				outcome: 0
			};

			expect(function() { blackjack.hit(box); }).to.throwError();
		});
	});
});