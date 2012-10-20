App.BoxesView = Backbone.View.extend({
    className: 'boxes',
    initialize: function() {
        this.views = [];
        this.collection.each(this.add, this);
    },
    add: function(model) {
        var view = new App.BoxView({ model: model });

        _.each(['sit', 'bet', 'hit', 'stand'], function(name) {
            view.on(name, function(e) { console.log('boxes', e); this.trigger(name, _.extend({ box: view.model }, e)); }, this);
        }, this);

        this.views.push(view);
        view.$el.appendTo(this.$el);
        return view;
    },
    render: function() {
        _.each(this.views, function(view) { view.render(); });
        return this;
    }
});