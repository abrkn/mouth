var Models = require('../models')
_ = require('underscore')
, Views = require('./views')
, async = require('async')
, settings = require('../settings');

module.exports = function(app, socket, id) {
    _.bindAll(this);
    console.log('constructing table', id);
	this.id = id;
    this.app = app;
	this.socket = socket;
    this.prefix = 'table:' + id + ':';
    this.queue = (function() {
        var enqueue = _.extend(function(fn) {
            if (enqueue.busy) return enqueue.queue.push(fn);
            enqueue.busy = true;
            fn(enqueue.callback);
        }, {
            busy: false,
            drain: null,
            queue: [],
            callback: function() {
                if (enqueue.queue.length) return enqueue.queue.splice(0, 1)[0](enqueue.callback);
                enqueue.busy = false;
                enqueue.drain && enqueue.drain();
            }
        });
        return enqueue;
    })();
    this.queue.drain = function() { console.log('<=== DRAIN ===========================>'); };
	this.subscribe('catchup', this.onSocketCatchup, { once: true });
    console.log('table', this.id, 'constructed');
};
_.extend(module.exports.prototype, {
    send: function(name, m) {
        name = this.prefix + name;
        setTimeout(_.bind(function() {
            this.queue(_.bind(function(callback) {
                this.socket.emit(name, m);
                console.log('[socket] --> ' + name, m);
                callback();
            }, this));
        }, this), this.app.settings.lag);
    },
    subscribe: function(name, fn, options) {
        name = this.prefix + name;
        //console.log('[socket] subscribing to', name);
    	options = _.extend({ queue: true, once: false }, options);
    	(options.once ? this.socket.once : this.socket.on).call(this.socket, name, _.bind(function(m) {
    		if (!options.queue) return fn.call(this, m);

            setTimeout(_.bind(function() {
                this.queue(_.bind(function(callback) {
                    fn.call(this, m, callback);
                }, this));
            }, this), this.app.settings.lag);
    	}, this));
    },
    onEject: function(m, callback) {
        var bv = this.view.boxes.views[m.box];
        bv.model.set({ bet: null, player: null });
        this.view.toggleActions();
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
    onSocketCatchup: function(m, callback) {
        console.log('catching up on table', this.id, 'with state', m);

        this.model = new Models.Table(m, { parse: true });
        this.view = new Views.TableView({ model: this.model });
        this.view.on('sit', function(e) { this.send('sit', e.box.get('index')); }, this);
        this.view.on('bet', function(e) { this.send('bet', { box: e.box.get('index'), bet: e.bet }); }, this);
        this.view.on('hit', function(e) { this.send('hit', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);
        this.view.on('stand', function(e) { this.send('stand', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);
        this.view.on('double', function(e) { this.send('double', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);

        this.subscribe('sit', function(m, callback) {
            var bv = this.view.boxes.views[m.box];
            /*bv.viewModel.set('canSit', false);
            bv.viewModel.set('canBet', m.player === this.app.player);*/
            bv.model.set('player', new Models.Player(m.player));
            this.view.toggleActions();
            callback();
        });

        this.subscribe('bet', this.onBet);

        this.subscribe('turn', function(turn, callback) {
            async.series({
                // post-split twenty-ones may have been skipped
                settle: this.view.settle,
                apply: _.bind(function(callback) {
                    this.model.set('turn', turn);
                    callback();
                }, this)
            }, callback);
        });

        this.subscribe('open', function(cards, callback) {
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
                settle: this.view.settle
            }, callback);
        });

        this.subscribe('hit', this.onHit);
        this.subscribe('double', this.onDouble);
        this.subscribe('deal', this.onDeal);
        this.subscribe('state', this.onState);
        this.subscribe('eject', this.onEject);

        callback();
    },

    onDouble: function(c, callback) {
        var turn = this.model.get('turn')
        , box = this.model.get('boxes').find(function(x){ return x.get('index') === turn[0]; })
        , hand = box.get('hands').find(function(x) { return x.get('index') === turn[1]; })
        , boxView = this.view.boxes.views[turn[0]]
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
                    settle: this.view.settle
                }, callback);
            }, this)
        }, callback);
    },
    onHit: function(c, callback) {
        var turn = this.model.get('turn')
        , box = this.model.get('boxes').find(function(x){ return x.get('index') === turn[0]; })
        , hand = box.get('hands').find(function(x) { return x.get('index') === turn[1]; })
        , boxView = this.view.boxes.views[turn[0]]
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
                settle: this.view.settle
            }, callback);
        }

        callback();
    },
    onState: function(m, callback) {
        if (m.state == 'betting') {
            console.log('betting time')
            async.series({
                settle: this.view.settle,
                discard: this.view.discard,
                apply: _.bind(function(callback) {
                    this.model.set('state', m.state);
                    callback();
                }, this),
                toggle: this.view.toggleActions
                // render?
            }, callback);
        } else {
            this.model.set('state', m.state);
            this.view.render();
            callback();
        }
    },

    end: function(callback) {
        this.view.discard(_.bind(function() {
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
                this.view.settle(callback);
            }, this)
        }, callback);
    }
});