App.CardView = App.View.extend({
    className: 'card',
    initialize: function() {
        _.bindAll(this);
        this.$container = $('<div>').css({ position: 'relative' }).appendTo(this.$el);

        this.$el.css({
            width: 73,
            height: 98
        });

        this.$back = $('<div>').css({
            background: 'url("http://i.imgur.com/Suin0.png") no-repeat',
            width: 73,
            height: 98,
            position: 'absolute',
            left: 0,
            top: 0
        }).appendTo(this.$container);

        this.$front = $('<div>').css({
            width: 73,
            height: 98,
            position: 'absolute',
            left: 0,
            top: 0
        }).appendTo(this.$container);
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
        /*this.$back.fadeTo(0, 0);
        this.$front.fadeTo(0, 0);

        var width = this.$back.width();
        var margin = width / 2;

        console.log('card appearing...');

        this.$back.fadeTo(animate, 0);
        this.$front.fadeTo(animate, 1);
        setTimeout(callback, animate);*/

        this.$back.fadeTo(0, 0);
        this.$front.fadeTo(0, 0);
        (this.model.attributes.value === 0 ? this.$back : this.$front).fadeTo(animate, 1);
        setTimeout(callback, animate);
    },
    render: function() {
        var value = this.model.attributes.value;
        if (typeof value === 'undefined') throw new Error('card value missing from model ' + JSON.stringify(this.model.toJSON()));

        if (value === 0) {
            this.$back.show();
            this.$front.hide();
        } else {
            this.$back.hide();
            this.$front.show();

            var suit = Math.floor((value - 1) / 13);
            var rank = (value - 1) % 13 + 1;

            this.$front.css({
                background: 'url("http://www.jfitz.com/cards/classic-playing-cards.png") no-repeat',
                'background-position-x': -((rank- 1) * 73),
                // convert from shdc(bridge) to cshd(no idea)
                'background-position-y': -([3, 0, 1, 2].indexOf(suit) * 98)
            });
        }

        return this;
    }
});