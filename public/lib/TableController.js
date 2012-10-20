App.TableController = function(id) {
	this.id = id;
	this.socket = App.socket;
    this.prefix = 'table:' + id + ':';

    this.queue = (function() {
        var enqueue = _.extend(function(fn) {
            if (enqueue.busy) return enqueue.queue.push(fn);
            enqueue.busy = true;
            fn(enqueue.callback);
        }, {
            busy: false,
            queue: [],
            callback: function() {
                enqueue.queue.length ? enqueue.queue.splice(0, 1)[0](enqueue.callback) : (enqueue.busy = false);
            }
        });
        return enqueue;
    })();

	this.subscribe('catchup', this.onSocketCatchup, { once: true, queue: false });
};

_.extend(App.TableController.prototype, {
    send: function(name, m) {
        this.socket.emit(this.prefix + name, m);
        console.log('-->' + this.prefix + name + ':', m);
    },
    subscribe: function(name, fn, options) {
    	options = _.extend({ queue: true, once: false }, options);
    	(options.once ? this.socket.once : this.socket.on).call(this.socket, this.prefix + name, _.bind(function(m) {
    		console.log(this.prefix + name, m);
    		if (!options.queue) return fn.call(this, m);
    		this.queue(_.bind(function(callback) {
                console.log('[subscribe] running handler for message', name, 'with', m);
    			fn.call(this, m, callback);
    		}, this));
    	}, this));
    },
    onSocketCatchup: function(m) {
        console.log('catching up on table', this.id, 'with state', m);
        this.queue.enabled = false;

        this.model = new App.Table(m, { parse: true });
        console.log('table state parsed', this.model.toJSON());

        this.view = new App.TableView({ model: this.model });
        this.view.on('sit', function(e) { this.send('sit', e.box.get('index')); }, this);
        this.view.on('bet', function(e) { this.send('bet', { box: e.box.get('index'), bet: e.bet }); }, this);
        this.view.on('hit', function(e) { this.send('hit', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);
        this.view.on('stand', function(e) { this.send('stand', { box: e.box.get('index'), hand: e.hand.get('index') }); }, this);

        this.subscribe('sit', function(m, callback) {
            var bv = this.view.boxes.views[m.box];
            bv.viewModel.set('canSit', false);
            bv.viewModel.set('canBet', m.player === App.player);
            bv.model.set({ player: m.player });
            callback();
        });

        this.subscribe('bet', function(e, callback) {
            console.log('bet', e.bet, 'in box', e.box);
            var box = this.model.get('boxes').at(e.box);
            box.set('bet', e.bet);
            callback();
        });

        this.subscribe('turn', function(turn, callback) {
            this.model.set('turn', turn);
            callback();
        });

        this.subscribe('open', function(cards, callback) {
            console.log('[table controller] dealer opening with', cards);

            this.model.set('turn', null);

            async.series({
                cards: _.bind(function(callback) {
                    async.forEachSeries(cards, _.bind(function(card, callback) {
                        console.log('[table controller] pushing card to dealer', card);
                        this.model.get('dealer').push(new App.Card({ value: card }), { animate: 750, callback: callback });
                    }, this), callback);
                }, this),
                conclusion: _.bind(function(callback) {
                    setTimeout(callback, 2500)
                }, this)
            }, callback);
        });

        this.subscribe('hit', function(card, callback) {
            console.log('hit', blackjack.pretty(card));

            var box = this.model.get('boxes').at(this.model.get('turn')[0]);
            console.log('box for hitting', box);

            var hand = box.get('hands').where({ index: this.model.get('turn')[1] })[0];
            console.log('hand for hitting', hand);

            if (!hand) {
                console.log('looked for hand index', this.model.get('turn')[1], 'in', box.get('hands'));
            }

            card = new App.Card({ value: card });
            hand.get('cards').push(card);

            if (blackjack.sum(hand.get('cards').plain()) > 21) {
                console.log('busted!');
                this.model.set('turn', null);

                setTimeout(_.bind(function() {
                    box.get('hands').remove(hand, { animate: true, callback: callback });
                }, this), 1500);

                return;
            }

            callback();
        });

        this.subscribe('deal', this.onDeal);

        this.subscribe('state', function(m, callback) {
            this.view.toggleActions();

            if (m.state == 'betting') {
                this.view.discard(_.bind(function() {
                    this.model.set('state', m.state);
                    callback();
                }, this));

                return;
            }

            this.model.set('state', m.state);
            callback();
        });

        this.view.render();
    },

    end: function(callback) {
        this.view.discard(_.bind(function() {
            console.log('table view discarded');
            callback();
        }));
    },

    onDeal: function(e, callback) {
        console.log('dealing cards to', e.boxes.length, 'boxes');

        async.series({
            dealer: _.bind(function(callback) {
                this.model.get('dealer').reset();
                this.model.get('dealer').add(new App.Card({ value: e.dealer }), { animate: 500, callback: callback }); 
            }, this),
            player1: _.bind(function(callback) {
                async.forEachSeries(e.boxes, _.bind(function(b, callback) {
                    var box = this.model.get('boxes').at(b.index);
                    var cards = new App.Cards;

                    console.log('TEMP bo bet', box.attributes);

                    var hand = new App.Hand({
                        index: 0,
                        cards: cards,
                        bet: box.get('bet')
                    });

                    box.set('bet', null);

                    box.get('hands').reset([hand]);
                    cards.add(new App.Card({ value: b.cards[0] }), { animate: 500, callback: callback });
                }, this), callback);
            }, this),
            player2: _.bind(function(callback) {
                async.forEachSeries(e.boxes, _.bind(function(b, callback) {
                    var cards = this.model.get('boxes').at(b.index).get('hands').at(0).get('cards');
                    cards.push(new App.Card({ value: b.cards[1] }), { animate: 500, callback: callback });
                }, this), callback);
            }, this)
        }, callback);
    }
});