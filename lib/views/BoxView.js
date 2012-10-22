module.exports = Backbone.View.extend({
    className: 'box',
    viewModel: null,
    template: _.template($('#box-template').remove().html()),
    initialize: function() {
        _.bindAll(this);
        this.$el.html(this.template({ }));

        this.hands = new App.HandsView({ collection: this.model.get('hands') });
        _.each(['hit', 'stand'], function(name) {
            this.hands.on(name, function(e) { this.trigger(name, e); }, this);
        }, this);
        this.hands.$el.appendTo(this.$el);

        this.model.on('change:player', this.render, this);
        this.model.on('change:bet', this.render, this);
        
        this.$el.addClass('box' + this.model.get('index'));

        this.viewModel = new Backbone.Model({
            canSit: false,
            canBet: false
        });

        this.viewModel.on('change:canSit reset', function() {
            this.$el.find('.btn.sit').toggle(this.viewModel.get('canSit'));
        }, this);

        this.viewModel.on('change:canBet reset', function() {
            this.$el.find('.btn.bet').toggle(this.viewModel.get('canBet'));
        }, this);

        this.chips = new App.ChipsView({ model: new Backbone.Model({ value: this.model.get('bet') || null }), el: this.$el.find('.chips:first ') }).render();
        ////REDUNDANT this.model.on('change:bet', _.bind(function() { this.chips.model.set('value', this.model.get('bet')); }, this));
    },
    events: {
        'click .btn.bet': 'onClickBet',
        'click .btn.sit': 'onClickSit'
    },
    onClickBet: function(e) {
        this.model.set('bet', (this.model.get('bet') || 0) + 100);
        this.trigger('bet', { bet: this.model.get('bet') });
    },
    onClickSit: function(e) {
        this.trigger('sit');
    },
    layout: function() {
    },
    render: function() {
        this.hands.render();

        this.$el.find('div.player').html(this.model.get('player') ? 'Player #' + this.model.get('player') : '');
        this.$el.find('.btn.sit').toggle(this.viewModel.get('canSit'));
        this.$el.find('.btn.bet').toggle(this.viewModel.get('canBet'));
        this.chips.model.set('value', this.model.get('bet') || null);

        this.layout();
        return this;
    }
});