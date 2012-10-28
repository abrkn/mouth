if (process.env.PORT) {
	module.exports = require('./secrets.heroku.js');
} else {
	module.exports = require('./secrets.local.js');
}