var mongoose = require('mongoose')
, secrets = require('../secrets')
, Schema = mongoose.Schema
, UserSchema = new Schema({
	facebook: String,
	name: String,
	balance: { type: Number, default: 0 }
});

mongoose.connect(secrets.db);

module.exports = {
	User: mongoose.model('User', UserSchema)
};