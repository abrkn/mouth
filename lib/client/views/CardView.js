var _ = require('underscore')
, Backbone = require('backbone')
, View = require('./View');

module.exports = View.extend({
    className: 'card',
    initialize: function() {
        _.bindAll(this);
    },
    discard: function(animate, callback) {
        var offset = this.$el.offset()
        , $clone = this.$el.clone().css({
            position: 'absolute',
            left: offset.left,
            top: offset.top
        }).appendTo('body').animate({
            left: -100,
            top: -100,
            opacity: 0
        }, animate, callback);
        this.destroy();
    },
    appear: function(animate, callback) {
        this.$el.fadeTo(0, 0);
        this.$el.fadeTo(+animate, 1, callback);
    },
    render: function() {
        var value = this.model.attributes.value;

        this.$el.show();

        var suit = Math.floor((value - 1) / 13);
        var rank = (value - 1) % 13 + 1;

        this.$el.css({
            // convert from shdc(bridge) to cshd(arbitrary)
            'background-position-y': -([3, 0, 1, 2].indexOf(suit) * 98),
            'background-position-x': -((rank- 1) * 73)
        });

        return this;
    }
});