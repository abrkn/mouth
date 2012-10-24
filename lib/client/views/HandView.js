var Backbone = require('backbone')
, View = require('./View')
, ChipsView = require('./ChipsView')
, CardsView = require('./CardsView')
, _ = require('underscore');

module.exports = View.extend({
    className: 'hand',
    template: _.template($('#hand-template').remove().html()),
    initialize: function() {
        _.bindAll(this);
        this.$el.html(this.template({ }));
        this.cards = new CardsView({ collection: this.model.get('cards'), layout: 1, el: this.$el.find('>.cards') });
        this.chips = new ChipsView({ model: new Backbone.Model({ value: this.model.get('bet') }), el: this.$el.find('.chips') }).render();

        this.viewModel = new Backbone.Model({
            canAct: false
        });

        this.viewModel.on('change reset', this.render);
        this.model.on('change reset', this.render);
        this.model.get('cards').on('add', this.render);
    },
    events: {
        'click .btn.hit': function() { this.trigger('hit'); },
        'click .btn.double': function() { this.trigger('double'); },
        'click .btn.stand': function() { this.trigger('stand'); }
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