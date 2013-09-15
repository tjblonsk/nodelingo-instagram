var mongoose = require('mongoose'),
    UserSchema = require('./User'),
    conf = require('../conf');

var uri = conf.mongo_uri;
mongoose.connect(uri);

var User = mongoose.model('User', UserSchema);

module.exports.User = User;
