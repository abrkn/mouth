window.App = {
	settings: {
        debugDisplayQueue: true,
        automate: false
	},
    tables: [],

	initialize: function() {
        $(function() {
            // id from query string
            var m = window.location.search.match(/[\?\&]p=(\d+)/);
            App.player = m ? +m[1] : 1;

        	App.tables = new Backbone.Collection;
        	App.lobby = new App.LobbyView({ collection: App.tables });

        	App.socket = io.connect(window.location.protocol + '//' + window.location.host);

        	App.socket.once('connect', function() {
        		console.log('[socket] connected');


                App.socket.emit('auth', App.player, function(auth) {
                    console.log('authorized', auth);
                    App.socket.emit('join', 1);
                });
        	});

        	App.socket.on('tables', function(tables) {
        		console.log('tables received', tables);
        		App.tables.reset(tables);
        	});

        	App.socket.on('join', function(id) {
                var table = new App.TableModule(App.socket, id);
                App.tables.push(table);

                if (App.settings.automate) {



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
        });
    },

    util: {
        ghost: function($el) {
            return $el.clone().css('position', 'absolute').css($el.offset()).appendTo('body');
        }
    }
};

_.templateSettings = {
    evaluate: /\(%([\s\S]+?)%\)/g,
    interpolate: /\(%=([\s\S]+?)%\)/g,
    escape: /\(%-([\s\S]+?)%\)/g
};