window.App = {
	settings: {
        debugDisplayQueue: true
	},
    player: 1,
    tables: [],

	initialize: function() {
        $(function() {
        	App.tables = new Backbone.Collection;
        	App.lobby = new App.LobbyView({ collection: App.tables });

        	App.socket = io.connect('http://localhost:3007');

        	App.socket.once('connect', function() {
        		console.log('connected');
        		App.socket.emit('join', 1);
        	});

        	App.socket.on('tables', function(tables) {
        		console.log('tables received', tables);
        		App.tables.reset(tables);
        	});

        	App.socket.on('join', function(id) {
                console.log('joined table', id);

                App.tables.push(new App.TableController(id));
        	});
        });
    }
};

_.templateSettings = {
    evaluate: /\(%([\s\S]+?)%\)/g,
    interpolate: /\(%=([\s\S]+?)%\)/g,
    escape: /\(%-([\s\S]+?)%\)/g
};