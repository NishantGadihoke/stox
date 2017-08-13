var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StocksSchema = new Schema({
  name: String,
  symbol: String,
  currentPrice: Number,
  previousPrice: Number,
  change: {
    type: Number,
    default: 0
  },
  numberOfTeamsInPossession: {
    type: Number,
    default: 0
  }
});


var Stocks = mongoose.model('Stocks', StocksSchema);
module.exports = Stocks;
