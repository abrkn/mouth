var Hand = function(index, bet, cards) {
	this.cards = cards || [];
	this.insurance = 0;
	this.doubled = 0;
	this.index = index;
	this.bet = bet;
};