var _ = require('underscore')
, debug = require('debug')('table')
, blackjack = require('../blackjack')
, Models = require('../models')
, App = require('./App')
, assert = require('assert')
, settings = require('../settings');

module.exports = function(model) {
	_.bindAll(this);
	this.model = model;
	this.clients = [];
	this.turnTimer = null;
	this.endBettingTimer = null;
};

_.extend(module.exports, {
	id: 0,
	defaults: {
		boxes: 5
	}
});

_.extend(module.exports.prototype, {
	broadcast: function(name, message) {
		_.each(this.clients, function(client) {
			this.send(client, name, message);
		}, this);
	},
	send: function(client, name, message) {
		debug('table', this.model.id, '-->', client.socket.id, ':', name, ':', message);
		client.socket.emit('table ' + this.model.id + ':' + name, message);
	},
	add: function(client) {
		debug('adding client', client.socket.id)
		var existing = !!_.where(this.clients, { player: client.player })[0];

		debug('adding', (existing?'existing':'new'), 'client', client.socket.id, 'to table', this.model.id, 'player', client.player.model.id);

		this.clients.push(client);

		if (!existing) {
			this.model.get('players').push(client.player.model);
			this.broadcast('join', _.pick(client.player.model.toJSON(), 'id', 'name'));
		}

		_.each({
			'sit': this.onSit,
			'bet': this.onBet,
			'hit': this.onHit,
			'double': this.onDouble,
			'stand': this.onStand,
			'eject': this.onEject,
			'double': this.onDouble,
			'insurance': this.onInsurance,
			'surrender': this.onSurrender,
			'split': this.onSplit
		}, function(fn, k) {
			client.socket.on('table ' + this.model.id + ':' + k, _.bind(fn, this, client));
		}, this);

		client.socket.on('disconnect', _.bind(function() {
			this.clients.splice(this.clients.indexOf(client), 1);
		}, this));
	},
	onSplit: function(client, m) {
		return debug('*** split not implemented');
	},
	onInsurance: function(client, m) {
		return debug('*** insurance not implemented');
	},
	onSurrender: function(client, m) {
		return debug('*** surrender not implemented');
	},
	boxIfClientControls: function(client, boxIndex) {
		var box = this.model.get('boxes').at(boxIndex);
		if (_.isUndefined(box)) debug('eject: box bad/missing', boxIndex);
		else if (!box.get('player')) debug('eject: box not occupied');
		else if (box.get('player').id != client.player.model.id) debug('eject: player does not own box', boxIndex);
		else return box;
		return null;
	},
	onEject: function(client, message) {
		if (this.model.get('state') != 'betting') return this.send(client, 'error', 'cannot eject outside betting state');
		var box = this.boxIfClientControls(client, message.box);
		if (!box) return this.send(client, 'error', 'box check failed');
		this.eject(box);
	},

	sendState: function(client) {
		var message = { state: this.model.get('state') };

		if (typeof client === 'undefined') {
			return this.broadcast('state', message);
		}

		this.send(client, 'state', message);
	},
	onBet: function(client, m) {
		if (this.model.get('state') != 'betting') return this.send(client, 'error', 'bet outside betting state');
		var box = this.boxIfClientControls(client, m.box);
		if (!box) return this.send(client, 'error', 'bet: box check failed');
		if (!m.bet || m.bet < 0) return this.send(client, 'error', 'bet: weird amount');
		box.set('bet', m.bet);
		this.broadcast('bet', { box: m.box, bet: m.bet });

		if (this.endBettingTimer) clearTimeout(this.endBettingTimer);
		this.endBettingTimer = setTimeout(this.deal, 3000);
	},
	onStand: function(client, message) {
		if (this.model.get('state') != 'playing') return this.send(client, 'error', 'stand: outside playing state');
		var box = this.boxIfClientControls(client, message.box);
		if (!box) this.send(client, 'error', 'stand: box check failed');
		if (this.model.get('turn')[0] !== box.get('index')) return this.send(client, 'error', 'box not on turn');
		if (this.model.get('turn')[1] !== message.hand) return this.send(client, 'error', 'hand not on turn');
		this.nextTurn();
	},

	handIfClientOnTurn: function(client, boxIndex, handIndex) {
		if (this.model.get('state') != 'playing') return null;
		var box = this.boxIfClientControls(client, boxIndex);
		if (!box) return null;
		if (this.model.get('turn')[1] !== handIndex) return null;
		var hand = box.get('hands').where({ index: handIndex })[0];
		return hand;
	},

	onHit: function(client, message) {
		var box = this.boxIfClientControls(client, message.box);
		if (!box) return this.send(client, 'error', 'hit: box check fail');

		var hand = this.handIfClientOnTurn(client, message.box, message.hand);
		if (!hand) return this.send(client, 'error', 'hit: hand check fail');

		var card = new Models.Card(this.model.get('deck').pop());
		hand.get('cards').push(card);
		debug('player hits a', card.pretty(), 'to a', hand.get('cards').pretty());
		this.broadcast('hit', card.get('value'));

		var score = hand.get('cards').score();

		if (score == 21) {
			debug('player has drawn to 21, auto standing');
			this.model.set('turn', null);
			return setTimeout(this.nextTurn, settings.timing.autoStand);
		}

		if (score > 21) {
			debug('player has busted');
			box.get('hands').remove(hand);
			return this.nextTurn();
		}

		debug('player has a new sum of', hand.get('cards').sum(), 'and can still draw');
		this.broadcast('turn', this.model.get('turn'));
	},

	onDouble: function(client, message) {
		var box = this.boxIfClientControls(client, message.box);
		if (!box) return this.send(client, 'error', 'double: box check fail');

		var hand = this.handIfClientOnTurn(client, message.box, message.hand);
		if (!hand) return this.send(client, 'error', 'double: hand check fail');

		if (hand.get('cards').length != 2) return this.send(client, 'error', 'double: non-natural hand');

		var card = new Models.Card(this.model.get('deck').pop());
		hand.get('cards').push(card);
		debug('player doubles with a', card.pretty(), 'to a', hand.get('cards').pretty());
		this.broadcast('double', card.get('value'));

		var score = hand.get('cards').score();

		if (score > 21) {
			debug('player has busted');
			box.get('hands').remove(hand);
		}

		return this.nextTurn();
	},

	end: function() {
		var dealerScore = this.model.get('dealer').score();

		this.model.get('boxes').each(function(box) {
			box.get('hands').each(function(hand) {
				if (dealerScore > 21) return debug('dealer is busted, box', box.index, 'hand', hand.get('index'), 'wins');

				var handScore = hand.get('cards').score();
				debug('box', box.get('index'), 'hand', hand.get('index'), (handScore == dealerScore ? 'pushes' : handScore > dealerScore ? 'wins' : 'loses'));
				return;
			});

			box.get('hands').reset();
		}, this);

		this.model.get('dealer').reset();
		this.model.set('turn', null);

		this.betting();
	},

	open: function() {
		debug('dealer opens');

		// dealer has already drawn 2 cards at this point
		// dealer stands on s17
		while (this.model.get('dealer').score() < 17) {
			this.model.get('dealer').push(this.model.get('deck').pop());
			debug('dealer draws a ' + this.model.get('dealer').last().pretty(), '(', this.model.get('dealer').pretty(), ')');
		}

		debug('dealer stands with a ' + this.model.get('dealer').pretty());

		this.broadcast('open', this.model.get('dealer').rest(1));
	},

	onTurnTimeout: function() {
		debug('turn time out');
		this.nextTurn();
	},

	nextTurn: function() {
		if (this.turnTimer) {
			clearTimeout(this.turnTimer);
			this.turnTimer = null;
		}

		var turn = this.getNextTurn(this.model.get('turn'));

		if (turn) {
			this.model.set('turn', turn);
			this.broadcast('turn', turn);
			return;
		}

		var challengers = this.model.get('boxes').filter(function(b) {
			// any non-blackjack hand
			return b.get('hands').length && (b.get('splits') > 0 || !blackjack.isBlackjack(b.get('hands').at(0).get('cards').plain()));
		});

		if (challengers.length) {
			debug('dealer will open to challenge', _.where(this.model.get('boxes'), function(b) { return b.get('hands').length > 0; }));
			this.model.set('turn', null);
			this.open();
		} else {
			debug('there are no hands to challenge dealer');
		}

		this.end();
	},

	getNextTurn: function(turn) {
		turn = turn ? turn.slice(0) : null;

		while (true) {
			if (!turn) {
				turn = [0, 0];
			} else if (this.model.get('boxes').byIndex(turn[0]).get('splits') > turn[1]) {
				turn[1]++;
			} else if (this.model.get('boxes').length > turn[0] + 1) {
				turn[0]++;
				turn[1] = 0;
			} else {
				return null;
			}

			var box = this.model.get('boxes').byIndex(turn[0]);
			var hand = box.get('hands').byIndex(turn[1]);
			if (!hand) continue;
			if (!hand.get('bet')) continue;
			if (hand.get('cards').score() == 21) continue;
			// todo: no hit split aces check

			return turn;
		}
	},

	startTurnTimer: function() {
		this.turnTimer = setTimeout(this.onTurnTimeout, 1000 * 10);
	},

	eject: function(box) {
		debug('ejecting player from box', box.get('index'));
		box.set('player', null);
		this.broadcast('eject', { box: box.get('index') });
	},

	betting: function() {
		this.model.set('state', 'betting');
		this.sendState();
	},

	catchup: function() {
		var state = this.model.toJSON();
		var hushed = _.extend({
			id: this.model.id,
			dealer: state.dealer ? state.dealer.slice(0, 1) : null,
			players: _.map(state.players, function(player) {
				return _.pick(player, 'id', 'name');
			}),
			boxes: _.map(state.boxes, function(box) {
				return _.extend({
					player: box.player ? _.pick(box.player, 'id', 'name'): null,
					hands: _.map(box.hands, function(hand) {
						return _.extend({
						}, _.pick(hand, 'index', 'bet', 'doubled', 'insurance', 'cards'));
					}),
				}, _.pick(box, 'index', 'bet', 'splits'));
			})
		}, _.pick(state, 'state', 'rules', 'turn'));

		return hushed;
	},

	deal: function() {
		if (this.model.get('state') != 'betting') return debug('deal called outside betting state');
		if (this.endBettingTimer) clearTimeout(this.endBettingTimer);

		var boxes = this.model.get('boxes').filter(function(b) { return b.get('bet') != null; });

		this.model.get('deck').reset(_.map(blackjack.deck(), function(c) { return new Models.Card({ value: c }) }));
		this.model.get('dealer').reset([this.model.get('deck').pop()]);

		_.each(boxes, function(box) {
			box.get('hands').reset([
				new Models.Hand({
					index: 0,
					bet: box.get('bet'),
					cards: new Models.Cards([ this.model.get('deck').pop() ])
				})
			]);
			box.set('bet', null);
			box.set('splits', 0);
		}, this);

		this.model.get('dealer').push(this.model.get('deck').pop());

		_.each(boxes, function(box) {
			box.get('hands').at(0).get('cards').push(this.model.get('deck').pop());
		}, this);

		this.broadcast('deal', {
			dealer: this.model.get('dealer').toJSON(),
			boxes: _.map(boxes, function(box) {
				return { 
					index: box.get('index'), 
					cards: box.get('hands').at(0).get('cards').toJSON()
				};
			})
		});

		this.model.set('state', 'playing');
		this.nextTurn();
	},

	onSit: function(client, index) {
		if (this.model.get('state') != 'betting') return this.send(client, 'error', 'sit: not in betting state');
		debug(index)
		var box = this.model.get('boxes').byIndex(index);
		if (_.isUndefined(box)) return this.send(client, 'error', 'sit: box not found');
		if (box.get('player')) return this.send(client, 'error', 'sit: box already occupied');
		box.set('player', client.player.model);
		this.broadcast('sit', { player: _.pick(client.player.model.toJSON(), 'id', 'name'), box: index });
	}
});