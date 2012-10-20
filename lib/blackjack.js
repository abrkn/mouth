(function() {
var _ = this._ || require('underscore')
, sum = function(a, b) { return a + b; };

var bj = {
	suits: ['s', 'h', 'd', 'c'],
	ranks: ['a', '2', '3', '4', '5', '6', '7', '8', '9', 't', 'j', 'q', 'k'],

	rank: function(card) {
		return ((card - 1) % 13) + 1;
	},

	value: function(rank) {
		return rank <= 10 ? rank : 10;
	},

	card: function(str) {
		if (str.length != 2) throw new Error('invalid card ' + str);
		var card = str.toLowerCase();
		var rank = bj.ranks.indexOf(card[0]) + 1;
		if (!rank) throw new Error('invalid rank in ' + str);
		var suit = bj.suits.indexOf(card[1]);
		if (!~suit) throw new Error('invalid suit in ' + str);
		return suit * 13 + rank;
	},

	pretty: function(value, debug) {
		if (_.isArray(value)) {
			var sum = bj.sum(value);
			return sum + (bj.isSoft(value) ? '/' + (sum + 10) : '');
		}

		return '' + bj.ranks[(value - 1) % 13] + bj.suits[Math.floor((value - 1) / 13)];
	},

	hand: function(str) {
		return _.map(str.split(/\s/), function(card) { return bj.card(card); });
	},

	values: function(hand) {
		return _.map(hand, function(card) { return bj.value(bj.rank(card)); });
	},

	sum: function(hand) {
		return _.reduce(bj.values(hand), sum);
	},

	highSum: function(hand) {
		return bj.sum(hand) + (bj.isSoft(hand) ? 10 : 0);
	},

	isSoft: function(hand) {
		return bj.hasAce(hand) && bj.sum(hand) <= 11;
	},

	hasAce: function(hand) {
		return bj.values(hand).indexOf(1) !== -1;
	},

	isBlackjack: function(hand) {
		return hand.length == 2 && bj.sum(hand) == 11 && bj.hasAce(hand);
	},

	deck: function() {
 		return _.chain(_.range(1, 53)).sortBy(function() { return Math.random(); }).value();
 	},

 	hit: function(box) {
 		if (typeof box.outcome !== 'undefined') throw new Error('box is already settled');

 	},

	deal: function(stake) {
		var deck = bj.deck();

		var box = {
			deck: deck,
			dealer: [deck.pop(), deck.pop()],
			hands: [[deck.pop(), deck.pop()]],
			stake: stake
		};

		var playerBj = bj.isBlackjack(box.hands[0]);
		var dealerUpAce = bj.rank(box.dealer[0]) == 1;

		if (playerBj && !dealerUpAce) {
			// dealer is showing ten with an ace under
			if (bj.isBlackjack(box.dealer)) {
				box.outcome = box.stake;
			} else {
				box.outcome = box.stake * 2.5;
			}
		}

		return box;
	},

	isBust: function(hand) {
		return _.reduce(hand, sum) > 21;
	}
};

if (typeof module !== 'undefined') module.exports = bj;
else this.blackjack = bj;
}).call(this);