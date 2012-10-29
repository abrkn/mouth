var secrets = require('../secrets')
, monk = require('monk')
, db = monk(secrets.db)
, _ = require('underscore')
, users = db.get('users');

module.exports = db;

_.extend(users, {
	take: function(userId, amount, callback) {
		users.update({
			_id: userId,
			balance: { $gte: amount }
		}, {
			$inc: { balance: -amount }
		}, function(err, updates) {
			callback && callback(err ? err : updates ? null : new Error('failed to take amount'));
		});
	},
	give: function(userId, amount, callback) {
		users.update({
			_id: userId,
			balance: { $gte: amount }
		}, {
			$inc: { balance: amount }
		}, function(err, updates) {
			callback && callback(err ? err : updates ? null : new Error('failed to give amount'));
		});
	}
});