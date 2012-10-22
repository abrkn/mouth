var Backbone = require('backbone')
, Models = require('./models')
, _ = require('underscore');

module.exports = function() {
    this.settings = {
        debugDisplayQueue: true,
        automate: false,
        lag: 0
    };

    _.templateSettings = {
        evaluate: /\(%([\s\S]+?)%\)/g,
        interpolate: /\(%=([\s\S]+?)%\)/g,
        escape: /\(%-([\s\S]+?)%\)/g
    };

    $(this.initialize);
};

_.extend(module.exports.prototype, {
    initialize: function() {
        // id from query string
        var m = window.location.search.match(/[\?\&]p=(\d+)/);
        this.player = m ? +m[1] : 1;

        this.tables = new Backbone.Collection;
        this.lobby = new this.LobbyView({ collection: this.tables });

        this.socket = io.connect(window.location.protocol + '//' + window.location.host);

        this.socket.once('connect', function() {
            console.log('[socket] connected');


            this.socket.emit('auth', this.player, function(auth) {
                console.log('authorized', auth);
                this.socket.emit('join', 1);
            });
        });

        this.socket.on('tables', function(tables) {
            console.log('tables received', tables);
            this.tables.reset(tables);
        });

        this.socket.on('join', function(id) {
            var table = new this.TableModule(this.socket, id);
            this.tables.push(table);

            if (this.settings.automate) {



                var box = null;
                var bet = 0;

                table.queue.drain = function() {
                    if (table.model.attributes.state == 'betting') {
                        if (box) {

                        } else {
                            console.log('no box')
                            box = table.model.get('boxes').where({ player: null })[0];
                            table.send('sit', box.attributes.index);
                        }
                    }
                };
            }
        });
    },

    util: {
        ghost: function($el) {
            return $el.clone().css('position', 'absolute').css($el.offset()).appendTo('body');
        }
    }
});