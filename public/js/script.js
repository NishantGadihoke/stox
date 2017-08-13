var socket = io.connect('http://localhost:4000');
var socket = io.connect('http://192.168.1.6:4000');

$('button.buy').click(function() {
  var stockName = $(this).parent().siblings('.stockName').html();
  var stockPrice = $(this).parent().siblings('.stockPrice').html();
  socket.emit('buy', {
    name: stockName,
    price: stockPrice
  });
  // socket.emit('updateAll'); //Updating current user
});

$('button.sell').click(function() {
  var stockName = $(this).parent().siblings('.stockName').html();
  var stockPrice = $(this).parent().siblings('.stockPrice').html();
  socket.emit('sell', {
    name: stockName,
    price: stockPrice
  });
  // socket.emit('updateAll'); //Updating current user
});

socket.on('update', function(data) {
  $('span.number').text(data.money);
  $('#stocksTable tr:not(:first-child)').each(function() {
    var stockName = $(this).children('.stockName').text();
    if (data.stocksBought[data.stocksBought.findIndex(x => x.name == stockName)] != undefined) {
      var numberOfStocks = data.stocksBought[data.stocksBought.findIndex(x => x.name == stockName)].numberOfStocks;
      $(this).children('.numberOfStocks').text(numberOfStocks);
    } else {
      var numberOfStocks = 0;
    }
  });
});

socket.on('updateAll', function(data) {
  $('#stocksTable tr:not(:first-child)').each(function() {
    var displayedCurrent = $(this).children('.stockPrice').text();
    var stockName = $(this).children('.stockName').text();
    var currentPrice = data.stocks[data.stocks.findIndex(x => x.name == stockName)].currentPrice; //Gets current price from server
    var previousPrice = data.stocks[data.stocks.findIndex(x => x.name == stockName)].previousPrice; //Gets previous price from server
    var change = data.stocks[data.stocks.findIndex(x => x.name == stockName)].change;
    var numberOfTeamsInPossession = data.stocks[data.stocks.findIndex(x => x.name == stockName)].numberOfTeamsInPossession;
    if (currentPrice != displayedCurrent) {
      console.log(data.stocks[data.stocks.findIndex(x => x.name == stockName)].name + ' has changed to ' + currentPrice + ' by ' + change + '% with currently ' + numberOfTeamsInPossession + ' teams in possession');
    }
    $(this).find('.delta').text(change);
    $(this).children('.stockPrice').text(currentPrice);
  });
});
