App.Box = Backbone.Model.extend({
	parse: function(resp, xhr) {
		resp.hands = resp.hands ? new App.Hands(resp.hands, { parse: true }) : new App.Hands;
		return resp;
	}
});

App.Boxes = Backbone.Collection.extend({
	model: App.Box
});