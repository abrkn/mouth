module.exports = Backbone.Router.extend({
	routes: {
		'': 'lobby'
	},

	lobby: function() {
		App.lobby || (App.lobby = new App.LobbyView({ collection: App.tables }));
		App.lobby.render();
	}
});

_.bindAll(App.router);