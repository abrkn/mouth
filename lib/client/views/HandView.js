var Backbone = require('backbone')
, View = require('./View')
, ChipsView = require('./ChipsView')
, CardsView = require('./CardsView')
, _ = require('underscore');

module.exports = View.extend({
    className: 'hand',
    initialize: function() {
        _.bindAll(this);

        this.cards = new CardsView({ 
            collection: this.model.get('cards'), 
            layout: 1, 
         });
        this.cards.$el.appendTo(this.$el);

        this.chips = new ChipsView({ 
            model: new Backbone.Model({ value: this.model.get('bet') }) 
        });
        this.chips.$el.appendTo(this.$el);

        this.$hit = $('<button class="btn hit">Hit</button>').attr('data-action', 'hit').appendTo(this.$el);
        this.$stand = $('<button class="btn stand">Stand</button>').attr('data-action', 'stand').appendTo(this.$el);
        //this.$double = $('<button class="btn double">Double</button>').attr('data-action', 'double').appendTo(this.$el);

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
        this.$hit.add(this.$stand).toggle(this.viewModel.get('canAct'));

        // todo: DAS rule
        ////this.$double.toggle(this.viewModel.get('canAct') && this.model.get('cards').length == 2);

        this.cards.render();

        this.chips.model.set('value', this.model.get('bet') || null);
        this.chips.render();

        return this;
    }
});