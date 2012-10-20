App.HandView = App.View.extend({
    className: 'hand',
    template: _.template($('#hand-template').remove().html()),
    initialize: function() {
        _.bindAll(this);
        this.$el.html(this.template({ }));

        this.cards = new App.CardsView({ collection: this.model.get('cards'), layout: 1, el: this.$el.find('>.cards') });

        this.viewModel = new Backbone.Model({
            canAct: false
        });

        this.viewModel.on('change:canAct', this.onChangeCanAct);
        this.$el.find('.btn.hit, .btn.stand').hide();

        console.log('at init, hand view has bet of', this.model.get('bet'));
        this.chips = new App.ChipsView({ model: new Backbone.Model({ value: this.model.get('bet') }), el: this.$el.find('.chips') }).render();
        console.log('hand chips', this.chips.model.attributes)
    },
    discard: function(animate, callback) {
        console.log('HandView: discarding', this.cards.length, 'cards');
        this.cards.discard(animate, callback);
    },
    events: {
        'click .btn.hit': 'onHitClicked',
        'click .btn.stand': 'onStandClicked'
    },
    onHitClicked: function(e) {
        console.log('hit clicked');
        this.trigger('hit');
    },
    onStandClicked: function(e) {
        this.trigger('stand');
    },
    onChangeCanAct: function() {
        this.$el.find('.btn.stand, .btn.hit').toggle(this.viewModel.get('canAct'));
    },
    turn: function(value) {
        return;
        if (typeof value !== 'undefined' && value !== this._canAct) {
            this._canAct = value;
            var i = 1;

            this.options.queue.take(_.bind(function() {
                var actions = _.map(['hit', 'stand'], function(a) { return this.$el.find('.btn.' + a); }, this);
                var $actions = _.reduce(actions, function(a, b) { return a.add(b); });
                $actions.toggle(10, _.bind(function() { if (i--) this.options.queue.leave(); console.log('toggled') }, this));
            }, this));
        }

        return this._canAct;
    },
    render: function() {
        this.cards.render();
        console.log('at render, hand view model has a bet of', this.model.attributes.bet);
        this.chips.model.set('value', this.model.get('bet') || null);
        return this;
    }
});