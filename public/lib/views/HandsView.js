App.HandsView = Backbone.View.extend({
    className: 'hands',
    initialize: function() {
        _.bindAll(this);
        this.collection.on('add', this.add);
        this.collection.on('remove', this.remove);
        this.collection.on('reset', this.reset);
        
        this.views = [];
        this.collection.each(this.add);
        this.layout();
        this.render();
    },
    reset: function(collection, options) {
        options = _.extend({ animate: false, callback: null }, options);

        if (options.callback) {
            async.forEachSeries(_.clone(this.views), _.bind(function(view, callback) {
                this.remove(view.model, this.collection, _.extend({}, options, { callback: callback }));
            }, this), options.callback);
        } else {
            _.each(this.views, _.bind(function(view) { this.remove(view.model); }, this));
            this.collection.each(this.add);
        }
    },
    remove: function(model, collection, options) {
        options = _.extend({ animate: false, callback: null }, options);
        var view = _.find(this.views, function(view) { return view.model === model });

        if (options.animate) {
            view.cards.collection.reset([], { callback: _.bind(function() {
                this.views.splice(this.views.indexOf(view), 1);
                view.destroy();
                view = null;
                options.callback();
            }, this), animate: options.animate });
            return;
        }

        this.views.splice(this.views.indexOf(view), 1);
        view.destroy();
    },
    add: function(model) {
        var view = new App.HandView({ model: model });
        this.views.push(view);
        view.render().$el.appendTo(this.$el);

        _.each(['hit', 'stand'], function(name) {
            view.on(name, function(e) { this.trigger(name, _.extend({ hand: view.model }, e)); }, this);
        }, this);
    },
    layout: function() {
        var margin = 20;
        var sum = function(a,b){return a+b};
        var width = _.reduce(_.map(this.views, function(x) {
            return x.$el.width() + margin;
        }), sum, 0);
        
        var offset = 0;
        
        _.each(this.views, function(view) {
            view.$el.css('left', width - offset);
            offset += view.$el.width() + margin;
        }, this);
    },
    render: function() {
        return this;
    }
});