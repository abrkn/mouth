App.LobbyView = Backbone.View.extend({
	ItemView: Backbone.View.extend({
		template: _.template($('#lobby-table-template').remove().html()),
		tagName: 'li',
		events: {
			'click a[href="#join"]': 'join'
		},
		join: function(e) {
			e.preventDefault();

			App.socket.emit('join', this.model.get('id'));
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	}),

	el: '#lobby',
	initialize: function() {
		_.bindAll(this);
		this.collection.on('reset', this.render, this);
	},
	add: function(model) {
		var view = new this.ItemView({ model: model });
		this.$el.find('ul').append(view.render().$el);
	},
	render: function() {
		var $ul = this.$el.find('ul');
		$ul.empty();
		this.collection.each(this.add, this);
		return this;
	}
});