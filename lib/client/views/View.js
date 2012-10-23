var Backbone = require('backbone');

module.exports = Backbone.View.extend({
	destroy: function() {
	    this.undelegateEvents();
	    this.$el.removeData().unbind(); 
	    Backbone.View.prototype.remove.call(this);
	}
});