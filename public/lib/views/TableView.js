App.TableView = Backbone.View.extend({
	el: '#table',
	initialize: function() {
		_.bindAll(this);

		this.prefix = 'table:' + this.model.attributes.id + ':';

		this.dealer = new App.DealerView({ model: this.model.get('dealer') });
		this.dealer.$el.appendTo(this.$el);

		this.boxes = new App.BoxesView({ collection: this.model.attributes.boxes });
		this.boxes.$el.appendTo(this.$el);

		_.each(['sit', 'bet', 'hit', 'stand'], function(name) {
			this.boxes.on(name, function(e) { this.trigger(name, e); }, this);
		}, this);

		this.model.on('change:rules', this.onRulesChange);
		this.model.on('reset change:state', this.onStateChange);
		this.model.on('change:turn', this.onTurnChange);

		this.render();
	},
	toggleActions: function(callback) {
		_.each(this.boxes.views, function(bv) {
			bv.viewModel.set('canSit', bv.model.get('player') === null && !!~['over', 'betting', 'dead'].indexOf(this.model.get('state')));
			var mine = bv.model.get('player') === App.player;
			var bot = this.model.get('state') == 'playing' && this.model.get('turn') !== null && this.model.get('turn')[0] === bv.model.get('index');
			bv.viewModel.set('canBet', mine && this.model.get('state') == 'betting');

			_.each(bv.hands.views, function(hv) {
				var hot = bot && this.model.get('turn')[1] === hv.model.get('index');
				hv.viewModel.set('canAct', hot);
			}, this);
		}, this);

		callback && callback();
	},
	// attempt to settle (box view needed to obtain splits)
	settleHand: function(box, hand, callback) {
		var result = null;

		var cards = handView.cards.collection.plain();
		var splits = box.model.get('splits');
		var bet = hand.model.get('bet');

		if (blackjack.isBust(cards)) {
			result = 0;
		} else if (!splits && blackjack.isBlackjack(cards)) {
			result = 2.5 * bet;
		} else {
			// may not have drawn at this point
			var dealer = this.dealer.cards.collection.plain();

			if (dealer.length == 1) return callback && callback();
		}
	},
	pay: function(chips, amount, callback) {
		var wonChipsView = new App.ChipsView({ 
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
			}, 1500);

			callback();
		});
	},
	take: function(chips, callback) {
		var $ghost = App.util.ghost(chips.$el);
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
		console.log('setting');
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

				async.series({
					money: _.bind(function(callback) {
						if (returned == 1) {
							console.log('*** NOT IMPLEMENTED *** TableView.settle for push');
							console.log('splits', splits, 'hand', hand, 'dealer', dealer);
							callback();
						} else if (returned > 1) {
							this.pay(hv.chips, (returned - 1) * bet, callback)
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
	render: function() {
		this.toggleActions();

		this.dealer.render();
		this.boxes.render();

		return this;
	}
});