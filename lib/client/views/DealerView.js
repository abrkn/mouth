var Backbone = require('backbone')
, View = require('./View')
, CardsView = require('./CardsView');

module.exports = View.extend({
    className: 'dealer',
    initialize: function() {
        _.bindAll(this);
        this.cards = new CardsView({ collection: this.model, layout: 2 });
        this.cards.$el.appendTo(this.$el);
    },
    render: function() {
        this.cards.render();
        this.$el.css({ width: this.cards.$el.width(), height: this.cards.$el.height() });
        return this;
    }
});