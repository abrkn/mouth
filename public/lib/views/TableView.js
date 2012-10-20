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
	toggleActions: function() {
		console.log('TableView: toggling actions');
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
	},
	settle: function(callback) {
		console.log('TODO: table view settlement');
		callback();
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

		console.log('state change (table view handler) to', this.model.get('state'));

		if (this.model.get('state') == 'betting') {
			console.log('--- BETTING --------------------');
		} else if (this.model.get('state') == 'playing') {
			console.log('--- PLAYING --------------------');
		}
	},
	onTurnChange: function() {
		this.toggleActions();
	},
	// todo: move box creation to controller
	onRulesChange: function() {
		_.each(_.range(this.model.attributes.rules.boxes), function(index) {
			var box = new App.Box({
				hands: new Backbone.Collection,
				index: index
			});

			this.model.attributes.boxes.push(box);
		}, this);
	},
	render: function() {
		this.toggleActions();

		this.dealer.render();
		this.boxes.render();

		return this;
	}
});