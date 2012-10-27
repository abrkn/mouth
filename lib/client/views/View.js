var _ = require('underscore')
, Backbone = require('backbone');

module.exports = Backbone.View.extend({
	bindTo: function(target, event, callback, context) {
		(this.bindings || (this.bindings = [])).push(arguments);
		target.on.apply(target, _.toArray(arguments).splice(1));
	},
	destroy: function() {
		_.each(this.bindings, function(binding) {
			binding[0].off.apply(this, binding.splice(1));
		});

	    this.undelegateEvents();
	    this.$el.removeData().unbind(); 
	    Backbone.View.prototype.remove.call(this);
	}
});