var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var UserSchema = Schema({
    name: String,
    username: String,
    accessToken: String,
    id: String,
    bio: String,
    profileImage: String
});

module.exports = UserSchema;