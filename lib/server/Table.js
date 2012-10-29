var _ = require('underscore')
, debug = require('debug')('table')
, blackjack = require('../blackjack')
, Models = require('../models')
, App = require('./App')
, assert = require('assert')
, db = require('./app.db')
, async = require('async')
, Queue = require('../Queue')
, settings = require('../settings');

module.exports = function(model) {
	_.bindAll(this);
	this.model = model;
	this.clients = [];
	this.turnTimer = null;
	this.endBettingTimer = null;
	this.queue = new Queue();
	this.queue.drain = function() { debug('----- DRAIN ------------'); };
};

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
		this.queue(_.bind(function(callback) {
			this.onAdd(client, callback);
		}, this));
	},

	boxIfClientControls: function(client, boxIndex) {
		var box = this.model.get('boxes').at(boxIndex);
		if (_.isUndefined(box)) debug('eject: box bad/missing', boxIndex);
		else if (!box.get('player')) debug('eject: box not occupied');
		else if (box.get('player').id != client.player.id) debug('eject: player does not own box', boxIndex);
		else return box;
		return null;
	},

	handIfClientOnTurn: function(client, boxIndex, handIndex) {
		if (this.model.get('state') != 'playing') return null;
		var box = this.boxIfClientControls(client, boxIndex);
		if (!box) return null;
		if (this.model.get('turn')[1] !== handIndex) return null;
		var hand = box.get('hands').where({ index: handIndex })[0];
		return hand;
	},

	onAdd: function(client, callback) {
		debug('adding client', client.socket.id)
		var existing = !!_.where(this.clients, { player: client.player })[0];

		debug('adding', (existing?'existing':'new'), 'client', client.socket.id, 'to table', this.model.id, 'player', client.player.id);

		this.clients.push(client);

		if (!existing) {
			this.model.get('players').push(client.player);
			this.broadcast('join', _.pick(client.player.toJSON(), '_id', 'name'));
		}

		_.each({
			'sit': this.onClientSit,
			'bet': this.onClientBet,
			'hit': this.onClientHit,
			'stand': this.onClientStand,
		}, function(fn, k) {
			client.socket.on('table ' + this.model.id + ':' + k, _.bind(function(message) {
				this.queue(function(callback) {
					fn.call(this, client, message, callback);
				});
			}, this));
		}, this);

		client.socket.on('disconnect', _.bind(function() {
			this.clients.splice(this.clients.indexOf(client), 1);
		}, this));

		callback();
	},

	setTimeout: function(fn, timeout) {
		return setTimeout(_.bind(function() {
			this.queue(function(callback) {
				fn(callback);
			});
		}, this), timeout);
	},

	onClientBet: function(client, message, callback) {
		if (this.model.get('state') != 'betting') {
			return this.send(client, 'error', 'bet outside betting state');
			return callback();
		}

		var box = this.boxIfClientControls(client, message.box);

		if (!box) {
			this.send(client, 'error', 'bet: box check failed');
			return callback();
		}

		if (!message.bet || message.bet < 0) {
			this.send(client, 'error', 'bet: weird amount');
			return callback();
		}

		if (message.bet > box.get('player').get('balance')) {
			this.send(client, 'error', 'balance doesnt cover bet');
			return callback();
		}

		db.get('users').take(box.get('player').id, message.bet, _.bind(function(err) {
			if (err) {
				client.send('error', 'take fail');
				return callback();
			}

			box.get('player').set('balance', box.get('player').get('balance') - message.bet);
			box.set('bet', (box.get('bet') || 0) + message.bet);
			this.broadcast('bet', { box: message.box, bet: message.bet });

			if (this.endBettingTimer) clearTimeout(this.endBettingTimer);

			this.endBettingTimer = this.setTimeout(this.deal, 3000);

			callback();
		}, this));
	},

	onClientStand: function(client, message, callback) {
		if (this.model.get('state') != 'playing') {
			this.send(client, 'error', 'stand: outside playing state');
			return callback();
		}

		var box = this.boxIfClientControls(client, message.box);

		if (!box) {
			this.send(client, 'error', 'stand: box check failed');
			return callback();
		}

		if (this.model.get('turn')[0] !== box.get('index')) {
			this.send(client, 'error', 'box not on turn');
			return callback();
		}

		if (this.model.get('turn')[1] !== message.hand) {
			this.send(client, 'error', 'hand not on turn');
			return callback();
		}

		this.nextTurn(callback);
	},

	onClientHit: function(client, message, callback) {
		var box = this.boxIfClientControls(client, message.box);

		if (!box) {
			this.send(client, 'error', 'hit: box check fail');
			return callback();
		}

		var hand = this.handIfClientOnTurn(client, message.box, message.hand);

		if (!hand) {
			this.send(client, 'error', 'hit: hand check fail');
			return callback();
		}

		var card = new Models.Card(this.model.get('deck').pop());
		hand.get('cards').push(card);
		debug('player hits a', card.pretty(), 'to a', hand.get('cards').pretty());
		this.broadcast('hit', card.get('value'));

		var score = hand.get('cards').score();

		if (score == 21) {
			debug('player has drawn to 21, auto standing');
			this.nextTurn(callback);
			return;
		}

		if (score > 21) {
			debug('player has busted');
			box.get('hands').remove(hand);
			this.nextTurn(callback);
			return;
		}

		debug('player has a new sum of', hand.get('cards').sum(), 'and can still draw');
		this.broadcast('turn', this.model.get('turn'));

		callback();
	},

	settle: function(callback) {
		var dealerScore = this.model.get('dealer').score()
		, dealerCards = this.model.get('dealer').plain();

		this.model.get('boxes').each(function(box) {
			box.get('hands').each(function(hand) {
				var handScore = hand.get('cards').score();
				var returned = blackjack.settle(box.get('splits'), hand.get('cards').plain(), dealerCards, this.model.get('')) * hand.get('bet');

				if (returned > 0) {
					// todo: async issues
					db.get('users').give(box.get('player').id, returned);
					box.get('player').set('balance', box.get('player').get('balance') + returned);
				}
			}, this);

			box.get('hands').reset();
		}, this);

		callback();
	},

	end: function(callback) {
		this.model.set('turn', null);
		this.model.get('dealer').reset();

		this.settle(_.bind(function() {
			this.betting(callback);
		}, this));
	},

	open: function(callback) {
		debug('dealer opens');

		async.series({
			reveal: _.bind(function(callback) {
				debug('dealer reveals', this.model.get('dealer').at(1).pretty());
				this.broadcast('dealer:card', { card: this.model.get('dealer').at(1).toJSON() });
				setTimeout(callback, 1000);
			}, this),
			draw: _.bind(function(callback) {
				async.whilst(
					_.bind(function() {
						return this.model.get('dealer').score() < 17;
					}, this),
					_.bind(function(callback) {
						var card = this.model.get('deck').pop();
						this.model.get('dealer').push(card);
						debug('dealer draws a', card.pretty(), 'and has', this.model.get('dealer').pretty());
						this.broadcast('dealer:card', { card: card.toJSON() });
						setTimeout(callback, 1000);
					}, this),
					callback
				);
			}, this)
		}, _.bind(function() {
			this.end(callback);
		}, this));
	},

	onTurnTimeout: function(callback) {
		debug('turn time out');
		this.nextTurn(callback);
	},

	nextTurn: function(callback) {
		if (this.turnTimer) {
			clearTimeout(this.turnTimer);
			this.turnTimer = null;
		}

		var turn = this.getNextTurn(this.model.get('turn'));

		if (turn) {
			this.model.set('turn', turn);
			this.broadcast('turn', turn);
			callback();
			return;
		}

		var challengers = this.model.get('boxes').filter(function(b) {
			// any non-blackjack hand
			return b.get('hands').length && (b.get('splits') > 0 || !blackjack.isBlackjack(b.get('hands').at(0).get('cards').plain()));
		});

		if (challengers.length) {
			debug('dealer will open to challenge', _.where(this.model.get('boxes'), function(b) { return b.get('hands').length > 0; }));
			this.model.set('turn', null);
			this.open(callback);
			return;
		} else {
			debug('there are no hands to challenge dealer');
		}

		this.end(callback);
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

	betting: function(callback) {
		this.model.set('state', 'betting');
		this.broadcast('state', { state: 'betting' });
		callback();
	},

	catchup: function() {
		var state = this.model.toJSON();
		var hushed = _.extend({
			id: this.model.id,
			dealer: state.dealer ? state.dealer.slice(0, 1) : null,
			players: _.map(state.players, function(player) {
				return _.pick(player, '_id', 'name');
			}),
			boxes: _.map(state.boxes, function(box) {
				return _.extend({
					player: box.player ? _.pick(box.player, '_id', 'name'): null,
					hands: _.map(box.hands, function(hand) {
						return _.extend({
						}, _.pick(hand, 'index', 'bet', 'doubled', 'insurance', 'cards'));
					}),
				}, _.pick(box, 'index', 'bet', 'splits'));
			})
		}, _.pick(state, 'state', 'rules', 'turn'));

		return hushed;
	},

	deal: function(callback) {
		//this.model.get('deck').reset(_.map(blackjack.deck(), function(c) { return new Models.Card({ value: c }) }));
		this.model.get('deck').reset(_.map([1, 6, 10, 6], function(c) { return new Models.Card({ value: c }) }));

		var boxes = this.model.get('boxes').filter(function(b) { return b.get('bet') != null; });

		this.broadcast('deal');

		async.series({
			dealerUpCard: _.bind(function(next) {
				var card = this.model.get('deck').pop();
				this.model.get('dealer').reset([card]);
				this.broadcast('dealer:card', { card: card.toJSON() });
				next();
			}, this),
			playerFirstCards: _.bind(function(next) {
				async.forEachSeries(boxes, _.bind(function(box, next) {
					var card = this.model.get('deck').pop();
					box.get('hands').reset([
						new Models.Hand({
							index: 0,
							bet: box.get('bet'),
							cards: new Models.Cards([ card ])
						})
					]);
					this.broadcast('hand:bet', { box: box.get('index'), hand: 0, bet: box.get('bet') });
					box.set('bet', null);
					this.broadcast('hand:card', { box: box.get('index'), hand: 0, card: card.toJSON() });
					next();
				}, this), next);
			}, this),
			dealerDownCard: _.bind(function(next) {
				var card = this.model.get('deck').pop();
				this.model.get('dealer').push(card);
				this.broadcast('dealer:card', { card: { value: 0 } });
				next();
			}, this),
			playerSecondCards: _.bind(function(next) {
				async.forEachSeries(boxes, _.bind(function(box, next) {
					var card = this.model.get('deck').pop();
					box.get('hands').byIndex(0).get('cards').push(card);
					this.broadcast('hand:card', { box: box.get('index'), hand: 0, card: card.toJSON() });
					next();
				}, this), next);
			}, this),
			// todo: insurance
			check: _.bind(function(next) {
				if (this.model.get('dealer').score() == 21) {
					return this.open(callback);
				}

				next();
			}, this),
			turn: _.bind(function(next) {
				this.model.set('state', 'playing');
				this.broadcast('state', { state: 'playing' });
				this.nextTurn(next);
			}, this)
		}, callback);
	},

	onClientSit: function(client, index, callback) {
		if (this.model.get('state') != 'betting') {
			this.send(client, 'error', 'sit: not in betting state');
			return callback();
		}

		var box = this.model.get('boxes').byIndex(index);

		if (_.isUndefined(box)) {
			this.send(client, 'error', 'sit: box not found');
			return callback();
		}

		if (box.get('player')) {
			this.send(client, 'error', 'sit: box already occupied');
			return callback();
		}

		box.set('player', client.player);
		this.broadcast('sit', { player: client.player.id, box: index });

		callback();
	}
});