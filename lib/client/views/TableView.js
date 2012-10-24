var Backbone = require('backbone')
, _ = require('underscore')
, View = require('./View')
, DealerView = require('./DealerView')
, BoxesView = require('./BoxesView')
, ChipsView = require('./ChipsView')
, blackjack = require('../../blackjack');

module.exports = View.extend({
	el: '#table',
	initialize: function() {
		_.bindAll(this);

		this.app = require('../App.js');
		this.prefix = 'table:' + this.model.attributes.id + ':';

		this.dealer = new DealerView({ model: this.model.get('dealer') });
		this.dealer.$el.appendTo(this.$el);

		this.boxes = new BoxesView({ collection: this.model.attributes.boxes });
		this.boxes.$el.appendTo(this.$el);

		_.each(['sit', 'bet', 'hit', 'stand', 'double'], function(name) {
			this.boxes.on(name, function(e) { this.trigger(name, e); }, this);
		}, this);

		this.$balance = $('<div class=balance>').appendTo(this.$el);
		this.app.player.on('change:balance', this.updateBalance, this);

		this.model.on('reset change:state', this.onStateChange);
		this.model.on('change:turn', this.onTurnChange);

		this.render();
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
			}, 1500);

			callback();
		});
	},
	take: function(chips, callback) {
		var $ghost = this.app.util.ghost(chips.$el);
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
							this.pay(hv.chips, (returned - 1) * bet, callback);

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
	render: function() {
		this.toggleActions();
		this.updateBalance();

		this.dealer.render();
		this.boxes.render();

		return this;
	}
});