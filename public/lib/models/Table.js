App.Table = Backbone.Model.extend({
	defaults: {
		rules: null,
		state: 'unknown'
	},

	parse: function(resp, xhr) {
		resp.boxes = new App.Boxes(resp.boxes, { parse: true });
		resp.dealer = new App.Cards(resp.dealer, { parse: true });
		return resp;
	}
});