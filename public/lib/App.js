window.App = {
	settings: {
        debugDisplayQueue: true
	},
    tables: [],

	initialize: function() {
        $(function() {
            // id from query string
            var m = window.location.search.match(/[\?\&]p=(\d+)/);
            App.player = m ? +m[1] : 1;

        	App.tables = new Backbone.Collection;
        	App.lobby = new App.LobbyView({ collection: App.tables });

        	App.socket = io.connect('http://localhost:3007');

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
                console.log('joined table', id);

                App.tables.push(new App.TableModule(App.socket, id));
        	});
        });
    }
};

_.templateSettings = {
    evaluate: /\(%([\s\S]+?)%\)/g,
    interpolate: /\(%=([\s\S]+?)%\)/g,
    escape: /\(%-([\s\S]+?)%\)/g
};