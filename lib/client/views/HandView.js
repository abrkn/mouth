var Backbone = require('backbone')
, View = require('./View')
, ChipsView = require('./ChipsView')
, CardsView = require('./CardsView')
, _ = require('underscore');

module.exports = View.extend({
    className: 'hand',
    initialize: function() {
        _.bindAll(this);

        this.$hit = $('<button class="btn">Hit</button>').attr('data-action', 'hit');
        this.$stand = $('<button class="btn">Stand</button>').attr('data-action', 'stand');
        this.$double = $('<button class="btn">Double</button>').attr('data-action', 'double');

        this.cards = new CardsView({ collection: this.model.get('cards'), layout: 1, el: this.$el.append('<div>') });
        this.chips = new ChipsView({ model: new Backbone.Model({ value: this.model.get('bet') }), el: this.$el.find('.chips') }).render();

        this.viewModel = new Backbone.Model({
            canAct: false
        });

        this.viewModel.on('change reset', this.render);
        this.model.on('change reset', this.render);
        this.model.get('cards').on('add', this.render);
    },
    events: {
        'click *[data-action="hit"]': function() { this.trigger('hit'); },
        'click *[data-action="stand"]': function() { this.trigger('stand'); },
        'click *[data-action="double"]': function() { this.trigger('double'); },
    },
    render: function() {
        this.$el.find('.btn.stand, .btn.hit').toggle(this.viewModel.get('canAct'));

        // todo: DAS rule
        console.log('??? cards', this.viewModel.get('canAct') && this.model.get('cards').length == 2)
        this.$el.find('.btn.double').toggle(this.viewModel.get('canAct') && this.model.get('cards').length == 2);

        this.cards.render();
        this.chips.model.set('value', this.model.get('bet') || null);
        return this;
    }
});