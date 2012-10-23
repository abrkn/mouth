var Backbone = require('backbone')
, Models = require('../models')
, _ = require('underscore')
, Views = require('./views')
, Table = require('./Table');

Backbone.setDomLibrary(jQuery);

var App = Backbone.Router.extend({
    initialize: function() {
        _.bindAll(this);

        this.settings = {
            debugDisplayQueue: true,
            lag: 0
        };

        _.templateSettings = {
            evaluate: /\(%([\s\S]+?)%\)/g,
            interpolate: /\(%=([\s\S]+?)%\)/g,
            escape: /\(%-([\s\S]+?)%\)/g
        };

        this.util = {
            ghost: function($el) {
                return $el.clone().css('position', 'absolute').css($el.offset()).appendTo('body');
            }
        };

        // player id from query string or 1
        var m = window.location.search.match(/[\?\&]p=(\d+)/);
        this.player = new Models.Player({ id: m ? +m[1] : 1 });

        this.tables = new Backbone.Collection;
        this.lobby = new Views.LobbyView({ collection: this.tables });

        this.socket = io.connect(window.location.protocol + '//' + window.location.host);
        this.socket.emit = _.wrap(this.socket.emit, function(fn, name, message) {
            console.log('-->', name, _.toArray(arguments).slice(2));
            fn.apply(this, _.toArray(arguments).slice(1));
        });
        this.socket.$emit = _.wrap(this.socket.$emit, function(fn) {
            console.log('<--', arguments[1], _.toArray(arguments).slice(2));
            return fn.apply(this, _.toArray(arguments).slice(1));
        });
        this.socket.on('reconnect', function() {
            window.location = window.location;
        });

        this.socket.once('connect', _.bind(function() {
            console.log('[socket] connected', 'ctx', this.player);

            console.log('authing', this.player.attributes);
            this.socket.emit('auth', this.player.id, _.bind(function(auth) {
                console.log('authorized', auth);
                _.extend(this.player.attributes, auth);
                $(function() {
                    Backbone.history.start();
                });
            }, this));
        }, this));

        this.socket.on('tables', _.bind(function(tables) {
            console.log('tables received', tables);
            this.tables.reset(tables);
        }, this));

        this.socket.on('join', _.bind(function(id) {
            var table = new Table(this, this.socket, id);
            this.tables.push(table);
        }, this));
    },

    routes: {
        '': 'home',
        '/:table': 'table'
    },

    home: function() {
        this.table(1);
    },

    table: function(id) {
        this.socket.emit('join', 1);
    }
});

module.exports = new App;