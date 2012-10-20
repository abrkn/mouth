App.ChipsView = App.View.extend({
	className: 'chips',
	denominations: [25, 100, 500, 1000, 5000].reverse(),
	initialize: function() {
		_.bindAll(this);
		this.views = [];
		this.model.on('change', this.change);
	},
	change: function() {
		console.log('model changed for chips to', arguments);
		this.render();
	},
	lose: function(callback) {
		var offset = this.$el.offset()
		, clone = this.$el.clone().css(_.extend(offset, {
			position: 'absolute'
		})).appendTo('body').animate({
			top: 100,
			left: 450,
			opacity: 0
		}, 1000, _.bind(function() {
			this.destroy();
			callback();
		}, this));
		this.$el.hide();
	},
	render: function() {
		this.$el.empty();

		if (!this.model.get('value')) return this;

		var remaining = this.model.get('value')
		, spacing = 7, offset = spacing;

		_.each(this.denominations, _.bind(function(d, i) {
			while (remaining >= d) {
				$('<img src="/media/chip' + i + '.png"/>').addClass('chip').css({ top: (offset -= spacing) }).appendTo(this.$el);
				remaining -= d;
			}
		}, this));

		var $summary = $('<div class=summary / >').html(this.model.get('value') / 100.0).css({ top: offset - 15 }).appendTo(this.$el);

		return this;
	}
});