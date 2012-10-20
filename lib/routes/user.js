var _ = require('underscore')
, bcrypt = require('bcrypt')
, models = require('../models.js')
, User = _.extend(function(app) {
	var user = {
		create: function(options, callback) {
			var u = _.extend(
				new models.User,
				_.pick(options, 'email'),
				{
					password: bcrypt.hashSync(options.password, bcrypt.genSaltSync(10)),
					emailLower: options.email.toLowerCase()
				});
			u.save(function(err) {
				callback(err, u);
			});	
		},
		configure: function(app) {
			app.post('/user', function(req, res, next) {
				user.create(req.body, function(err, u) {
					return err ? next(err) : res.json(User.filterUser(u));
				});
			});
		}
	};

	if (app) user.configure(app);

	return user;
}, {
	filterUser: function(u) {
		return _.pick(u, '_id', 'email', 'balance', 'box');
	}
});

module.exports = User;