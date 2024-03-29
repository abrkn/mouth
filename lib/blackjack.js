var _ = require('underscore')
, plus = function(a, b) {  return a + b;  }
, bj = module.exports = {
	suits: ['s', 'h', 'd', 'c'],
	ranks: ['a', '2', '3', '4', '5', '6', '7', '8', '9', 't', 'j', 'q', 'k'],
	rank: function(card) { return ((card - 1) % 13) + 1; },
	value: function(rank) { return rank <= 10 ? rank : 10; },
	card: function(str) {
		if (str.length != 2) throw new Error('invalid card "' + str + '"');
		var card = str.toLowerCase();
		var rank = bj.ranks.indexOf(card[0]) + 1;
		if (!rank) throw new Error('invalid rank in ' + str);
		var suit = bj.suits.indexOf(card[1]);
		if (!~suit) throw new Error('invalid suit in ' + str);
		return suit * 13 + rank;
	},
	settle: function(splits, hand, dealer, dealerCheckedForBlackjack) {
		var playerBj = !splits && bj.isBlackjack(hand)
		, dealerBj = bj.isBlackjack(dealer);
		if (playerBj && dealerBj) return 1;
		if (playerBj && dealerCheckedForBlackjack !== false) return 2.5;
		// note: invalid for "original bet only"
		if (dealerBj) return 0;
		var handScore = bj.score(hand);
		if (handScore > 21) return 0;
		if (dealer.length == 1 || dealer[0] === 0 || dealer[1] === 0) return null;
		var dealerScore = bj.score(dealer);
		if (dealerScore > 21) return 2;
		if (handScore == dealerScore) return 1;
		if (handScore > dealerScore) return 2;
		return 0;
	},
	pretty: function(value, debug) {
		if (_.isArray(value)) {
			var sum = bj.sum(value);
			return sum + (bj.isSoft(value) ? '/' + (sum + 10) : '');
		}
		return '' + bj.ranks[(value - 1) % 13] + bj.suits[Math.floor((value - 1) / 13)];
	},
	isBust: function(hand) { return bj.sum(hand) > 21; },
	hand: function(str) {
		return _.map(str.split(/\s/), function(card) { return bj.card(card); });
	},
	values: function(hand) {
		return _.map(hand, function(card) { return bj.value(bj.rank(card)); });
	},
	sum: function(hand) { return _.reduce(bj.values(hand), plus, 0); },

	score: function(hand) {
		var sum = bj.sum(hand)
		, soft = bj.isSoft(hand);
		return sum + (soft && sum <= 11 ? 10 : 0);
	},

	isSoft: function(hand) {
		return bj.hasAce(hand) && bj.sum(hand) <= 11;
	},

	hasAce: function(hand) {
		return bj.values(hand).indexOf(1) !== -1;
	},

	isBlackjack: function(hand) {
		return hand.length == 2 && hand[0] !== 0 && hand[1] !== 0 && bj.sum(hand) == 11 && bj.hasAce(hand);
	},

	deck: function() {
 		return _.chain(_.range(1, 53)).sortBy(function() { return Math.random(); }).value();
 	},
 	
	isBust: function(hand) { bj.sum(hand) > 21; }
};