var _ = require('underscore');
var jQuery = require('jquery')
var CardView = require(__filename.replace(/test/, 'lib'))

var Backbone = require('backbone');
Backbone.setDomLibrary(jQuery);
//Backbone.document = jsdom;


describe('CardView', function() {
	describe('appear', function() {
		it('exists', function(done) {


			console.log(CardView)
			var target = new CardView({ el: jQuery('<div>') });
			target.appear({ callback: done });
		});
	});
});