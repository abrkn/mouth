var Backbone = require('backbone')
, Models = require('../models')
, _ = require('underscore')
, Views = require('./views');

Backbone.setDomLibrary(jQuery);

var App = Backbone.Router.extend({
    initialize: function() {
        _.bindAll(this);

        // Facebook hash strangeness
        if (window.location.hash == '#_=_') window.location.hash = '';

        _.templateSettings = {
            evaluate: /\(%([\s\S]+?)%\)/g,
            interpolate: /\(%=([\s\S]+?)%\)/g,
            escape: /\(%-([\s\S]+?)%\)/g
        };

        this.socket = io.connect();

        this.socket.on('error', function(reason) {
            console.log('socket error', reason);

            if (reason == 'session not found') {
                return window.location = '/auth/facebook';
            }
        });

        this.socket.on('reconnect', function() {
            window.location = window.location;
        });

        this.socket.on('not authenticated', function() {
            return window.location = '/auth/facebook';
        });

        this.socket.on('handshake unauthorized', function() {
            return window.location = '/auth/facebook';
        });

        // debugging messages
        this.socket.emit = _.wrap(this.socket.emit, function(fn, name, message) {
            console.log('-->', name, _.toArray(arguments).slice(2));
            fn.apply(this, _.toArray(arguments).slice(1));
        });

        this.socket.$emit = _.wrap(this.socket.$emit, function(fn) {
            console.log('<--', arguments[1], _.toArray(arguments).slice(2));
            return fn.apply(this, _.toArray(arguments).slice(1));
        });

        this.socket.on('connect', this.onSocketConnect);
    },

    onSocketConnect: function() {
        this.socket.on('join', _.bind(function(state) {
            var model = new  Models.Table(state, { parse: true });
           
            model.get('players').push(this.player);
            var table = new Views.TableView({ model: model });
        }, this));

        console.log('connected, waiting for profile');

        this.socket.on('profile', _.bind(function(player) {
            console.log('dat profile', player)
            this.player = new Models.Player(player, { parse: true });

            $(function() {
                Backbone.history.start();
            });
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

module.exports = App;