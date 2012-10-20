App.ChipsView = App.View.extend({
	className: 'chips',
	denominations: [25, 100, 500, 1000, 5000].reverse(),
	initialize: function() {
		this.views = [];
		this.model.on('change', this.change);
	},
	render: function() {
		this.$el.empty();

		var remaining = this.model.get('value')
		, spacing = 7, offset = spacing;

		_.each(this.denominations, _.bind(function(d, i) {
			while (remaining >= d) {
				$('<img src="/media/chip' + i + '.png"/>').addClass('chip').css({ top: (offset -= spacing) }).appendTo(this.$el);
				remaining -= d;
			}
		}, this));

		var $summary = $('<div class=summary / >').html(this.model.get('value') / 100.0).css({ top: offset }).appendTo(this.$el);

		return this;
	}
});