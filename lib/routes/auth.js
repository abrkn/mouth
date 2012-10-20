var _ = require('underscore')
, User = require('./user.js')
, models = require('../models.js')
, bcrypt = require('bcrypt')
, Auth = function(app) {
	this.app = app;

	app.get('/api/auth/whoami', function(req, res, next) {
		var user = req.session && req.session.user ? req.session.user : null;
		res.json({
			user: user ? self.filterUser(user) : null
		});
	});

	app.post('/api/auth/logout', function(req, res) {
	    req.session.destroy(function() {
	        res.json({ });
	    });
	});

	app.post('/api/auth/login', function(req, res, next) {
		self.authenticate(req.body.email, req.body.password, function(err, user) {
			return err ? next(err) : res.json(self.filterUser(user));
		});
	});
};

Auth.prototype = {
	authenticate: function(email, password, callback) {
		var user = models.User.findOne({ emailLower: email.toLowerCase() }, function(err, user) {
			if (err) return callback(err);
			if (!user) return callback(new Error('No such user'), null);
			if (!bcrypt.compareSync(password, user.password)) return callback(new Error('No such user'), null);
			callback(null, user);
		});
	}
};

module.exports = Auth;