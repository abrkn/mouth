var Backbone = require('backbone')
, View = require('./View')
, _ = require('underscore')
, HandsView = require('./HandsView')
, ChipsView = require('./ChipsView');

module.exports = View.extend({
    className: 'box',
    viewModel: null,
    initialize: function() {
        _.bindAll(this);

        this.$wrapper = $('<div style=position:relative>').appendTo(this.$el);
        this.$sit = $('<button class="btn sit">Sit</button>').attr('data-action', 'sit').appendTo(this.$wrapper);
        this.$bet = $('<button class=-"btn bet">Bet</button>').attr('data-action', 'bet').appendTo(this.$wrapper);
        this.$player = $('<div class=player>').appendTo(this.$wrapper);
        this.$chips = $('<div class=chips>').appendTo(this.$wrapper);

        this.hands = new HandsView({ collection: this.model.get('hands') });
        _.each(['hit', 'stand', 'double'], function(name) {
            this.hands.on(name, function(e) { this.trigger(name, e); }, this);
        }, this);
        this.hands.$el.appendTo(this.$wrapper);

        this.chips = new ChipsView({ 
            model: new Backbone.Model({ value: this.model.get('bet') || null }), 
            el: this.$chips 
        }).render();

        this.model.on('change', this.render);
        
        this.$el.addClass('box' + this.model.get('index'));

        this.viewModel = new Backbone.Model({
            canSit: false,
            canBet: false
        });
        this.viewModel.on('change reset', this.render);
    },
    events: {
        'click *[data-action="bet"]': 'onClickBet',
        'click *[data-action="sit"]': 'onClickSit',
    },
    onClickBet: function(e) {
        this.trigger('bet', { bet: 100 });
    },
    onClickSit: function(e) {
        console.log("sit!")
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