var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NewsSchema = new Schema({
  name: String,
  action: String,
  nature: String,
  time: {
    type: Date,
    default: Date.now
  }
});


var News = mongoose.model('News', NewsSchema);
module.exports = News;
