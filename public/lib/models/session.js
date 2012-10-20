App.Session = Backbone.Model.extend({
	defaults: {
		userId: null
	},

	initialize: function() {
		if ($.cookie('connect.sid')) {
			var that = this;

			$.ajax({
				url: '/api/auth/whoami',
				success: function(res) {
					if (res.error) {
						if (callback) callback(new Error(res.error));
						return;
					}

					_.extend(that.attributes, res.user);

					that.trigger('login whoami change');
				},
				error: function() {
					App.log.error("Who-am-i failed.");
				}
			});
		}
	},

	authenticated: function() {
		return !!this.attributes.userId;
	},

	login: function(values, callback) {
		var that = this;
		App.log.info("Logging in...");

		$.ajax({
			url: '/api/auth/login',
			type: 'POST',
			data: values,
			success: function(res) {
				if (res.error) {
					if (callback) callback(null, res);
					return;
				}

				_.extend(that.attributes, res.user);

				App.log.info("Login success", that);

				if (callback) callback(null, res);

				that.trigger('login change');
			},
			error: function() {
				if (callback) callback(new Error("Error"));
			}
		});
	},

	register: function(values, callback) {
		var that = this;

		$.ajax({
			url: '/api/auth/register',
			type: 'POST',
			data: values,
			success: function(res) {
				if (res.error === 0) {
					_.extend(that.attributes, res.user);
					that.trigger("register change");
					App.log.info("Register success.");
				}

				callback(null, res);
			},
			error: function() {
				callback(new Error("Error"));
			}
		});
	},

	logout: function(callback) {
		var that = this;

		$.ajax({
			url: '/api/auth/logout',
			type: 'POST',
			success: function(res) {
				if (res.error && callback) callback(new Error(res.error));

				if (callback) callback(null, res);

				that.trigger('logout change');
			},
			error: function() {
				App.log.error("Logout failed");

				if (callback) callback(new Error("Failed to log out."));
			}
		});

		// Just in case.
		$.cookie('connect.sid', '');
		this.attributes = _.clone(this.defaults);
	}
});
