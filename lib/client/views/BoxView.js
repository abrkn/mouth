var Backbone = require('backbone')
, View = require('./View')
, _ = require('underscore')
, HandsView = require('./HandsView')
, ChipsView = require('./ChipsView');

module.exports = View.extend({
    className: 'box',
    viewModel: null,
    template: _.template($('#box-template').remove().html()),
    initialize: function() {
        _.bindAll(this);
        this.$el.html(this.template({ }));

        this.hands = new HandsView({ collection: this.model.get('hands') });
        _.each(['hit', 'stand', 'double'], function(name) {
            this.hands.on(name, function(e) { this.trigger(name, e); }, this);
        }, this);
        this.hands.$el.appendTo(this.$el);

        this.chips = new ChipsView({ model: new Backbone.Model({ value: this.model.get('bet') || null }), el: this.$el.find('.chips:first ') }).render();

        this.model.on('change', this.render);
        
        this.$el.addClass('box' + this.model.get('index'));

        this.viewModel = new Backbone.Model({
            canSit: false,
            canBet: false
        });
        this.viewModel.on('change reset', this.render);
    },
    events: {
        'click .btn.bet': 'onClickBet',
        'click .btn.sit': 'onClickSit'
    },
    onClickBet: function(e) {
        //this.model.set('bet', (this.model.get('bet') || 0) + 100);
        this.trigger('bet', { bet: 100 });
    },
    onClickSit: function(e) {
        this.trigger('sit');
    },
    render: function() {
        this.hands.render();

        this.$el.find('div.player').html(this.model.get('player') ? this.model.get('player').get('name') : '');
        this.$el.find('.btn.sit').toggle(this.viewModel.get('canSit'));
        this.$el.find('.btn.bet').toggle(this.viewModel.get('canBet'));
        this.chips.model.set('value', this.model.get('bet') || null);
        
        return this;
    }
});