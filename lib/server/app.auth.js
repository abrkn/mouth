var passport = require('passport')
, secrets = require('../secrets.js')
, db = require('./app.db')
, FacebookStrategy = require('passport-facebook').Strategy
, debug = require('debug')('app.auth');

module.exports = {
	configure: function(app) {
		debug('configuring passport with facebook auth');

	 	app.use(passport.initialize());
	  	app.use(passport.session());
		app.get('/auth/facebook', passport.authenticate('facebook'));
		app.get('/auth/facebook/callback', passport.authenticate('facebook', {
	  		successRedirect: '/',
	        failureRedirect: '/login' 
	    }));

		passport.serializeUser(function(user, callback) {
		  callback(null, user);
		});

		passport.deserializeUser(function(user, callback) {
			/*debug('deserializeUser', id);
			db.get('users').findById(id, function(err, user) {
			    callback(err, user);
			});*/
			callback(null, user);
		});

		passport.use('facebook', new FacebookStrategy({
		    clientID: secrets.facebookApp,
		    clientSecret: secrets.facebook,
		    callbackURL: secrets.facebookCallbackUrl
		  },
		  function(accessToken, refreshToken, profile, callback) {
		  	debug('authentication callback for profile', profile.id);

		  	db.get('users').findOne({ facebook: profile.id }, function(err, user) {
		  		if (err) return callback(err);
		  		if (user) {
			  		debug('existing user', user._id, 'found in database');
		  			return callback(null, user);
			  	}

			  	debug('creating new user...');

			  	db.get('users').insert({
		  			facebook: profile.id,
		  			name: profile.displayName
			  	}, function(err, user) {
		  			debug('new user created');
			  		callback(err, user);
			  	});
		  	});
		  }
		));
	}
};