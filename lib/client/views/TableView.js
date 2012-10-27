var Backbone = require('backbone')
, _ = require('underscore')
, View = require('./View')
, DealerView = require('./DealerView')
, BoxesView = require('./BoxesView')
, ChipsView = require('./ChipsView')
, blackjack = require('../../blackjack')
, Queue = require('../Queue')
, Models = require('../models')
, async = require('async')
, clientutil = require('../util')
, settings = require('../../settings.js')
, TableSocket = require('../TableSocket');

var TableView = module.exports = View.extend({
	el: '#table',
	initialize: function() {
	    _.bindAll(this);

	    this.app = require('../entry');

	    this.queue = new Queue();
        this.queue.drain = function() { console.log('--- DRAIN --------'); };
		this.socket = new TableSocket(this.app.socket, 'table ' + this.model.id, this.queue);

		this.dealer = new DealerView({ model: this.model.get('dealer') });
		this.dealer.$el.appendTo(this.$el);

		this.boxes = new BoxesView({ collection: this.model.attributes.boxes });
    
        this.bindTo(this.boxes, 'sit', function(event) {
            this.send('sit', event.box.get('index'));
        }, this);

        this.bindTo(this.boxes, 'bet', function(event) {
            this.send('bet', { 
                box: event.box.get('index'),
                bet: event.bet
            });
        }, this);

        this.bindTo(this.boxes, 'hit', function(event) {
            this.send('hit', {
                box: event.box.get('index')
            });
        }, this);

		this.boxes.$el.appendTo(this.$el);

		this.$balance = $('<div class=balance>').appendTo(this.$el);

		this.bindTo(this.app.player, 'change:balance', this.updateBalance);
		this.bindTo(this.model, 'change:state', this.onStateChange);
		this.bindTo(this.model, 'change:turn', this.onTurnChange);

/*
        this.on('sit', function(e) { this.send('sit', e.box.get('index')); }, this);
        this.on('bet', function(e) { this.send('bet', { box: e.box.get('index'), bet: e.bet }); }, this);
        this.on('hit', function(e) { this.send('hit', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);
        this.on('stand', function(e) { this.send('stand', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);
        this.on('double', function(e) { this.send('double', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);
*/
        this.socket.on('sit', _.bind(function(message, callback) {
            var player = this.model.get('players').get(message.player);
            this.model.get('boxes').byIndex(message.box).set('player', player);
            this.toggleActions();
            callback();
        }, this));

        this.socket.on('bet', this.onBet);
        this.socket.on('hit', this.onHit);
        this.socket.on('stand', this.onStand);

        this.socket.on('turn', _.bind(function(turn, callback) {
            async.series({
                // post-split twenty-ones may have been skipped
                settle: this.settle,
                apply: _.bind(function(callback) {
                    console.log('turn:', turn)
                    this.model.set('turn', turn);
                    callback();
                }, this)
            }, callback);
        }, this));

        this.socket.on('open', _.bind(function(cards, callback) {
            console.log('[table controller] dealer opening with', cards);

            this.model.set('turn', null);

            async.series({
                cards: _.bind(function(callback) {
                    async.forEachSeries(cards, _.bind(function(card, callback) {
                        console.log('[table controller] pushing card to dealer', card);
                        this.model.get('dealer').push(new Models.Card(card), { animate: 750, callback: callback });
                    }, this), callback);
                }, this),
                conclusion: _.bind(function(callback) {
                    setTimeout(callback, 2500)
                }, this),
                settle: this.settle
            }, callback);
        }, this));

        this.socket.on('hit', this.onHit);
        this.socket.on('double', this.onDouble);
        this.socket.on('deal', this.onDeal);
        this.socket.on('state', this.onState);
        this.socket.on('eject', this.onEject);

		this.render();
	},
	destroy: function() {
		this.dealer.destroy();
		this.boxes.destroy();
		View.prototype.destroy.apply(this, arguments);
	},
    send: function(name, message) {
        this.socket.emit(name, message);
        console.log('[socket] --> ' + name, message);
    },
	updateBalance: function() {
		this.$balance.html('$' + this.app.player.get('balance') / 100);
	},
	toggleActions: function(callback) {
		_.each(this.boxes.views, function(bv) {
			bv.viewModel.set('canSit', bv.model.get('player') == null && this.model.get('state') == 'betting');

			var mine = bv.model.get('player') != null && bv.model.get('player').id == this.app.player.id;
			//console.log('box', bv.model.attributes.index, 'mine?', !!mine);
			var bot = this.model.get('state') == 'playing' && this.model.get('turn') !== null && this.model.get('turn')[0] === bv.model.get('index');

			bv.viewModel.set('canBet', mine && this.model.get('state') == 'betting');

			_.each(bv.hands.views, function(hv) {
				var hot = mine && bot && this.model.get('turn')[1] === hv.model.get('index');
				//console.log('hand', hv.model.attributes.index, 'hot?', hot);
				hv.viewModel.set('canAct', hot);
			}, this);
		}, this);

		callback && callback();
	},
	take: function(chips, callback) {
		var $ghost = clientutil.ghost(chips.$el);
		chips.destroy();
		$ghost.animate({
			top: 100,
			left: 350
		}).animate({
			opacity: 0
		}, {
			queue: true,
			complete: function() {
				callback();
			}
		});
	},
	settle: function(callback) {
		async.forEach(this.boxes.views, _.bind(function(bv, callback) {
			async.forEach(_.clone(bv.hands.views), _.bind(function(hv, callback) {
				var splits = bv.model.get('splits')
				, hand = hv.cards.collection.plain();

				if (hand.length == 0) return callback();

				var dealer = this.dealer.cards.collection.plain()
				, bet = hv.model.get('bet') // todo: doubled
				, returned = blackjack.settle(splits, hand, dealer);

				if (returned == null) return callback();

				console.log('settling hand', hv.model.attributes.index);

				var mine = bv.model.get('player').id == this.app.player.id;

				async.series({
					money: _.bind(function(callback) {
						if (returned == 1) {
							console.log('*** NOT IMPLEMENTED *** TableView.settle for push');
							console.log('splits', splits, 'hand', hand, 'dealer', dealer);
							callback();
							
							this.app.player.set('balance', this.app.player.get('balance') + returned * bet);
						} else if (returned > 1) {
							TableView.pay(hv.chips, (returned - 1) * bet, callback);

							this.app.player.set('balance', this.app.player.get('balance') + returned * bet);
						} else {
							this.take(hv.chips, callback);
						}
					}, this),
					pause: function(callback) {
						setTimeout(callback, 1500);
				 	},
					discard: function(callback) {
						async.parallel([
							function(callback) {
								console.log('fading chips');
								hv.chips.disappear(callback);
							},
							function(callback) {
								hv.cards.collection.reset([], { animate: true, callback: callback });
							}
						], callback);
					},
					destroy: function(callback) {
						hv.destroy();
						callback();
					}
				}, callback);
			}, this), callback);
		}, this), callback);
	},
	discard: function(callback) {
		async.parallel([
			// dealer
			_.bind(function(callback) {
				this.dealer.cards.collection.reset([], { animate: 1000, callback: callback });
			}, this),
			// boxes
			_.bind(function(callback) {
				async.forEach(this.boxes.views, function(bv, callback) {
					bv.model.get('hands').reset([], { animate: 1000, callback: callback });
				}, callback);
			}, this)
		], callback);
	},
	onStateChange: function() {
		this.toggleActions();
	},
	onTurnChange: function() {
		this.toggleActions();
	},
    onEject: function(m, callback) {
        var bv = this.boxes.views[m.box];
        bv.model.set({ bet: null, player: null });
        this.toggleActions();
        callback();
    },
    onBet: function(m, callback) {
        console.log('bet', m.bet, 'in box', m.box);
        var box = this.model.get('boxes').at(m.box);
        box.set('bet', (box.get('bet') || 0) + m.bet);

        if (box.get('player').id == this.app.player.id) {
            this.app.player.set('balance', this.app.player.get('balance') - m.bet);
        }

        callback();
    },
    onDouble: function(c, callback) {
        var turn = this.model.get('turn')
        , box = this.model.get('boxes').find(function(x){ return x.get('index') === turn[0]; })
        , hand = box.get('hands').find(function(x) { return x.get('index') === turn[1]; })
        , boxView = this.boxes.views[turn[0]]
        , handView = _.find(boxView.hands.views, function(v) { return v.model === hand })
        , card = new Models.Card({ value: c });

        this.model.set('turn', null);

        async.series({
            bet: _.bind(function(callback) {
                if (box.get('player').id == this.app.player.id) {
                    this.app.player.set('balance', this.app.player.get('balance') - hand.get('bet'));
                }
                
                hand.set('bet', hand.get('bet') * 2); // todo: double for less

                setTimeout(callback, 1000);
            }, this),
            draw: function(callback) {
                hand.get('cards').push(card, { animate: true, callback: callback });
            },
            bustCheck: _.bind(function(callback) {
                if (hand.get('cards').sum() <= 21) return callback();

                return async.series({
                    // little pause to let the player realize he busted
                    pause: function(callback) {
                        setTimeout(callback, settings.timing.bust);
                    },
                    settle: this.settle
                }, callback);
            }, this)
        }, callback);
    },
    onHit: function(c, callback) {
        var turn = this.model.get('turn')
        , box = this.model.get('boxes').find(function(x){ return x.get('index') === turn[0]; })
        , hand = box.get('hands').find(function(x) { return x.get('index') === turn[1]; })
        , boxView = this.boxes.views[turn[0]]
        , handView = _.find(boxView.hands.views, function(v) { return v.model === hand })
        , card = new Models.Card({ value: c });

        hand.get('cards').push(card);

        if (hand.get('cards').score() == 21) {
            this.model.set('turn', null);
            console.log('zzz, auto stand', settings.timing.autoStand);
            return setTimeout(callback, settings.timing.autoStand);
        }

        if (hand.get('cards').sum() > 21) {
            this.model.set('turn', null);

            return async.series({
                // little pause to let the player realize he busted
                pause: function(callback) {
                    setTimeout(callback, settings.timing.bust);
                },
                settle: this.settle
            }, callback);
        }

        callback();
    },
    onState: function(m, callback) {
        if (m.state == 'betting') {
            console.log('betting time')
            async.series({
                settle: this.settle,
                discard: this.discard,
                apply: _.bind(function(callback) {
                    this.model.set('state', m.state);
                    callback();
                }, this),
                toggle: this.toggleActions
                // render?
            }, callback);
        } else {
            this.model.set('state', m.state);
            this.render();
            callback();
        }
    },
    end: function(callback) {
        this.discard(_.bind(function() {
            console.log('table view discarded');
            callback();
        }));
    },
    onDeal: function(e, callback) {
        console.log('dealing cards to', e.boxes.length, 'boxes');

        this.model.set('state', 'playing');

        async.series({
            dealer: _.bind(function(callback) {
                this.model.get('dealer').reset();
                this.model.get('dealer').add(new Models.Card(e.dealer[0]), { animate: 500, callback: callback }); 
            }, this),
            player1: _.bind(function(callback) {
                async.forEachSeries(e.boxes, _.bind(function(b, callback) {
                    var box = this.model.get('boxes').at(b.index);
                    var cards = new Models.Cards;

                    var hand = new Models.Hand({
                        index: 0,
                        cards: cards,
                        bet: box.get('bet')
                    });

                    box.set('bet', null);
                    box.set('splits', 0);
                    box.get('hands').reset([hand]);
                    cards.add(new Models.Card(b.cards[0]), { animate: 500, callback: callback });
                }, this), callback);
            }, this),
            player2: _.bind(function(callback) {
                async.forEachSeries(e.boxes, _.bind(function(b, callback) {
                    var cards = this.model.get('boxes').at(b.index).get('hands').at(0).get('cards');
                    cards.push(new Models.Card(b.cards[1]), { animate: 500, callback: callback });
                }, this), callback);
            }, this),
            // settle blackjacks
            settle: _.bind(function(callback) {
                this.settle(callback);
            }, this)
        }, callback);
    },
	render: function() {
		this.toggleActions();
		this.updateBalance();

		this.dealer.render();
		this.boxes.render();

		return this;
	}
});

_.extend(module.exports, {
    pay: function(chips, amount, callback) {
        var wonChipsView = new ChipsView({ 
            model: new Backbone.Model({ value: amount })
        }).render();

        wonChipsView.$el.appendTo($('body')).css({
            position: 'absolute',
            top: 100,
            left: 350
        }).fadeTo(0, 0).animate({
            top: chips.$el.offset().top,
            left: chips.$el.offset().left - 28,
            opacity: 1
        }, function() {
            setTimeout(function() {
                wonChipsView.disappear();
            }, settings.timing.pay);

            callback();
        });
    }
});