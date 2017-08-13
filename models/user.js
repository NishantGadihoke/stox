var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new Schema({
  username: String,
  email: String,
  password: String,
  stocksBought: [
    {
      name: String,
      numberOfStocks: Number
    }
  ],
  totalCurrent: {
    type: Number,
    default: 10000
  }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
