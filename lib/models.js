var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
	balance: { type: Number, default: 0 },
	email: String,
	emailLower: { type: String, unique: true },
	password: String,
	box: Object
});

var Models = {
	User: mongoose.model('User', UserSchema)
};

module.exports = Models;