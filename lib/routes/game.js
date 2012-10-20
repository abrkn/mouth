var _ = require('underscore')
, models = require('../models.js')
, blackjack = require('../blackjack.js')
, Game = _.extend(function(app) {
	var game = {
		deal: function(userId, stake, callback) {
			userId = '5075666d09becdf007000001';
			stake = 100;

			models.User.findOne({ _id: userId }, function(err, u) {
				if (err) return callback(err);

				box = blackjack.deal(stake);

				callback(null, box);
			});
		},
		configure: function(app) {
			app.post('/api/game/deal', function(req, res, next) {
				//game.deal(req.session.user._id, req.body.stake, function(err, box) {
				game.deal(null, null, function(err, box) {
					return err ? next(err) : res.json(box);
				});
			});
		}
	};

	if (app) game.configure(app);

	return game;
}, {
	filterUser: function(u) {
		return _.pick(u, '_id', 'email', 'balance', 'box');
	}
});

module.exports = Game;