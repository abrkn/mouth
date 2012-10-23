var View = require('./View')
, CardView = require('./CardView')
, blackjack = require('../../blackjack');

module.exports = View.extend({
    className: 'cards',
    initialize: function() {
        _.bindAll(this);
        this.$summary = $('<div class=summary/>').appendTo(this.$el);
        this.collection.on('add', this.add, this);
        this.collection.on('reset', this.reset, this);
        this.collection.on('remove', this.remove, this);
        this.collection.on('add reset remove change', this.updateSummary);
        this.views = [];

        this.reset(this.collection, this.options);
        this.updateSummary();
    },
    updateSummary: function() {
        var cards = this.collection.plain();
        if (!cards.length) return this.$summary.hide();
        this.$summary.show();
        if (blackjack.sum(cards) > 21) return this.$summary.show().css({ 'background-color': 'red', color: 'white'}).html('BUSTED');
        this.$summary.show().css({ 'background-color': '', color: 'white'}).html(blackjack.pretty(cards));
    },
    reset: function(collection, options) {
        options = _.defaults(options, { animate: false, callback: null });
        
        if (options.callback) {
            this.$summary.fadeOut();
            async.forEach(_.clone(this.views), _.bind(function(view, callback) {
                this.remove(view.model, collection, _.defaults({ callback: callback }, options));
            }, this), options.callback);
        } else {
            _.each(this.views, function(view) { this.remove(view.model, this.collection, options); }, this);
            collection.each(this.add, this.collection, options);
        }
    },
    remove: function(model, collection, options) {
        var view = _.find(this.views, function(v) { return v.model === model });

        if (options.animate) {
            return view.discard(_.bind(function() {
                this.views.splice(this.views.indexOf(view), 1);
                view.destroy();
                options.callback();
            }, this));
        }

        this.views.splice(this.views.indexOf(view), 1);
        view.destroy();
    },
    add: function(model, collection, options) {
        var view = new CardView({ model: model }, options);
        this.views.push(view);
        this.$el.append(view.render().$el);
        this.layout();
        options.animate && view.appear(options.animate, options.callback);
        return view;
    },
    layout: function() {
        if (this.options.layout == 1) {
            var css = { left: 0, top: 0, width: 73, height: 98 }
            , spacing = { left: 20, top: 20 };

            _.each(this.views, function(card, index) {
                card.$el.css(css);
                css.left += spacing.left;
                css.top -= spacing.top;
            }, this);
        } else if (this.options.layout == 2) {
            var count = this.collection.length;
            var dim = { x: 73, y: 98 };
            var margin = { x: dim.x * 0.1, y: dim.y * 0.1 };
            var size = { 
                x: (dim.x + margin.x) * (count - 1) + dim.x,
                y: (dim.y + margin.y) * (count - 1) + dim.y
            };
     
            _.each(this.views, function(card, index) {
                card.$el.css({
                    top: 0,
                    left: ((dim.x + margin.x) * index),
                    height: dim.y,
                    width: dim.x
                });
            }, this);
        } else {
            throw new Error('unknown layout mode', this.options.layout);
        }
    },
    render: function() {
        _.each(this.views, function(view) { view.render(); });
        this.layout();
        return this;
    }
});