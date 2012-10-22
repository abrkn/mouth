module.exports = View.extend({
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

        this.chips = new App.ChipsView({ model: new Backbone.Model({ value: this.model.get('bet') }), el: this.$el.find('.chips') }).render();
    },
    events: {
        'click .btn.hit': 'onHitClicked',
        'click .btn.stand': 'onStandClicked'
    },
    onHitClicked: function(e) {
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
        this.chips.model.set('value', this.model.get('bet') || null);
        return this;
    }
});