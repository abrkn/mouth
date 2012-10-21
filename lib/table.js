var _ = require('underscore')
, debug = require('debug')('table')
, blackjack = require('./blackjack');

var Hand = function(index, bet, cards) {
	this.cards = cards || [];
	this.insurance = 0;
	this.doubled = 0;
	this.index = index;
	this.bet = bet;
};

var Box = function(index) {
	this.player = null;
	this.index = index;
	this.bet = null;
	this.deck = null;
	this.hands = null;
	this.splits = null;
};

_.extend(Box.prototype, {
});

var Table = module.exports = function(options) {
	this.options = _.defaults(options || {}, Table.defaults);
	this.id = ++Table.id;
	this.clients = [];
	this.deck = null;
	this.turn = null;
	this.boxes = _.map(_.range(this.options.boxes), function(index) {
		return new Box(index)
	});
	this.state = 'dead';
	this.dealer = null;
};

_.extend(Table, {
	id: 0,
	defaults: {
		boxes: 5
	}
});

_.extend(Table.prototype, {
	broadcast: function(name, message) {
		_.each(this.clients, function(client) {
			this.send(client, name, message);
		}, this);
	},
	pop: function() {
		if (!this.deck) throw new Error('no deck');
		if (!this.deck.length) throw new Error('deck is empty');
		return this.deck.pop();
	},
	send: function(client, name, message) {
		debug('to', client.socket.id, '-->', name, ':', message);
		client.socket.emit('table:' + this.id + ':' + name, message);
	},

	add: function(client) {
		var existing = _.any(this.clients, function(c) {
			return c.player == client.player;
		});

		debug('adding', (existing?'existing':'new'), 'client', client.socket.id, 'to table', this.id);
		this.clients.push(client);

		if (!existing) {
			this.broadcast('join', client.player.id);
		}

		var prefix = 'table:' + this.id + ':';

		client.socket.on(prefix + 'sit', _.bind(this.sit, this, client));
		client.socket.on(prefix + 'bet', _.bind(this.bet, this, client));
		client.socket.on(prefix + 'hit', _.bind(this.hit, this, client));
		client.socket.on(prefix + 'stand', _.bind(this.stand, this, client));

		client.socket.on('disconnect', _.bind(function() {
			this.clients.splice(this.clients.indexOf(client), 1);
		}, this));

		this.catchup(client);
	},

	sendState: function(client) {
		var message = { state: this.state };

		if (typeof client === 'undefined') {
			return this.broadcast('state', message);
		}

		this.send(client, 'state', message);
	},

	bet: function(client, message) {
		if (this.state != 'betting') {
			debug('player tried to bet when state is ' + this.state);
			return;
		}

		var box = this.boxes[message.box];

		if (box.player != client.player) {
			throw new Error('player must be seated to bet');
		}

		debug('client', client.socket.id, 'box', message.box, 'bets', message.bet);
		this.boxes[message.box].bet = message.bet;
		this.broadcast('bet', { box: message.box, bet: message.bet });

		setTimeout(_.bind(this.endBetting, this), 1500);
	},

	stand: function(client, message) {
		console.log('player', client.player.id, 'standing with message', message);

		if (this.state != 'playing') {
			throw new Error('not in playing state');
		}

		if (message.box != this.turn[0]) {
			throw new Error('box is not on turn');
		}

		var box = this.boxes[this.turn[0]];

		if (box.player != client.player) {
			throw new Error('player does not own box');
		}

		if (message.hand != this.turn[1]) {
			throw new Error('hand is not in turn');
		}

		debug('player stands with a', blackjack.pretty(box.hands[this.turn[1]].cards));

		//this.broadcast('stand')

		this.nextTurn();
	},

	hit: function(client, message) {
		console.log('player', client.player.id, 'hitting with message', message);

		if (this.state != 'playing') {
			throw new Error('not in playing state');
		}

		if (message.box != this.turn[0]) {
			throw new Error('box is not on turn');
		}

		var box = this.boxes[this.turn[0]];

		if (box.player != client.player) {
			throw new Error('player does not own box');
		}

		if (message.hand != this.turn[1]) {
			throw new Error('hand is not in turn');
		}

		var hand = box.hands[this.turn[1]];
		var card = this.pop();
		hand.cards.push(card);

		debug('player hits with a', blackjack.pretty(card), 'to a', blackjack.pretty(hand.cards));

		this.broadcast('hit', card);



		if (blackjack.highSum(hand.cards) != 21 && blackjack.sum(hand.cards) <= 21) {
			debug('player has a new sum of', blackjack.sum(hand.cards), 'and can still draw');
			return this.broadcast('turn', this.turn);
		}

		// take the money and cards
		box.hands.splice(this.turn[1], 1);
		box.bet = null;

		this.nextTurn();
	},

	end: function() {
		var dealerSum = blackjack.highSum(this.dealer);

		_.each(this.boxes, function(box) {
			if (!box.hands) return;
			_.each(box.hands, function(hand) {
				if (dealerSum > 21) {
					debug('dealer is busted, box', box.index, 'hand', hand.index, 'wins');
					return;
				}

				var handSum = blackjack.highSum(hand.cards);

				debug(box.index, 'hand', hand.index, (handSum == dealerSum ? 'pushes' : handSum > dealerSum ? 'wins' : 'loses'));
				return;
			});

			box.hands = null;
		}, this);

		this.dealer = null;
		this.turn = null;

		this.start();
	},

	open: function() {
		debug('dealer opens');

		// dealer has already drawn 2 cards at this point
		var j = 0;
		// dealer stands on s17
		while (blackjack.highSum(this.dealer) < 17) {
			this.dealer.push(this.pop());
			debug('dealer draws a ' + blackjack.pretty(_.last(this.dealer)), '(', blackjack.pretty(this.dealer), ')');
			if (++j > 10) return debug('stuck')
		}

		debug('dealer stands with a ' + blackjack.pretty(this.dealer));

		this.broadcast('open', _.tail(this.dealer, 1));
	},

	nextTurn: function() {
		debug('next turn');

		if (this.turn === null) {
			var next = _.find(this.boxes, function(b) { return !!b.hands; });
			this.turn = [next.index, 0];
		}
		else if (this.turn[1] + 1 < this.boxes[this.turn[0]].hands.length) {
			this.turn[1]++;

			debug('moving to next hand for box');
		} else {
			var next = _.find(_.rest(this.boxes, this.turn[0] + 1), function(b) { return !!b.hands; });

			if (next) {
				debug('moving to next box', next.index);
				this.turn[0] = next.index;
				this.turn[1] = 0;
			} else {
				var open = _.any(this.boxes, function(b) {
					// any non-blackjack hand
					return b.hands && b.hands.length && (b.splits > 0 || !blackjack.isBlackjack(b.hands[0].cards));
				});

				// open
				if (open) {
					debug('dealer will open to challenge', _.where(this.boxes, function(b) { return b.hands && b.hands.length > 0; }));
					this.turn = null;
					this.open();
				} else {
					console.log('there are no hands to challenge dealer in', _.where(this.boxes, function(b) { return b.hands && b.hands.length > 0; }));
				}

				return this.end();
			}
		}

		var hand = this.boxes[this.turn[0]].hands[this.turn[1]];

		console.log('hand on turn has', blackjack.pretty(hand.cards));

		if (blackjack.highSum(hand.cards) === 21) {
			debug('not giving turn to player with a 21 total');
			return this.nextTurn();
		}

		this.broadcast('turn', this.turn);
	},

	start: function() {
		debug('shuffling');
		//this.deck || (this.deck = blackjack.deck());
		this.deck = blackjack.deck();

		this.state = 'betting';
		this.sendState();
	},

	catchup: function(player) {
		var state = {
			state: this.state,
			rules: {
			},
			players: _.map(this.players, function(player) {
				return {
					id: player.id,
					name: '#' + player.id
				};
			}),
			boxes: _.map(this.boxes, function(box) {
				return {
					player: box.player ? box.player.id : null,
					index: box.index,
					bet: box.bet,
					hands: box.hands ? _.map(box.hands, function(hand) {
						return {
							cards: _.map(hand.cards, function(c) { return { value: c }; }),
							insurance: hand.insurance,
							doubled: hand.doubled,
							bet: hand.bet,
							index: hand.index
						}
					}) : null
				};
			}),
			dealer: _.map(this.state == 'playing' ? [this.dealer[0]] : this.dealer, function(c) { return { value: c }; }),
			turn: this.turn
		};

		console.log('catch up', player.id, 'with', state);

		this.send(player, 'catchup', state);
	},

	endBetting: function() {
		if (this.state != 'betting') {
			debug('wanted to end betting, but state is', this.state);
			return;
		}

		this.broadcast('end betting');

		var boxes = _.filter(this.boxes, function(box) {
			return box.player != null && box.bet > 0;
		});

		if (!boxes.length) {
			debug('no bets were received, starting over');
			this.start();
			return;
		}

		this.dealer = [this.pop(), this.pop()];

		_.each(boxes, function(box) {
			box.hands = [new Hand(0, box.bet, [1, 13])];
			//box.hands = [new Hand(0, box.bet, [this.pop(), this.pop()])];
			box.bet = null;
			box.splits = 0;
		}, this);

		this.state = 'playing';
		this.sendState();

		this.broadcast('deal', {
			dealer: this.dealer[0],
			boxes: _.map(boxes, function(box) {
				return { index: box.index, cards: box.hands[0].cards }
			})
		});

		this.nextTurn();
	},

	sit: function(client, index) {
		var box = this.boxes[index];

		if (!box) {
			throw new Error('cannot sit down in non-existing box');
		}

		if (box.player != null) {
			throw new Error('box is already occupied');
		}

		console.log('client', client.socket.id, 'sits down in', index);

		box.player = client.player;

		console.log('player sit', client.player.id, 'box', index);

		this.broadcast('sit', { player: client.player.id, box: index });

		if (this.state == 'dead') {
			return this.start();
		}
	}
});