var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var LocalStrategy = require('passport-local').Strategy;
var Server = require('http').Server;

var User = require("./models/user");
var Stocks = require("./models/stocks");

var app = express();

function roundStockValue(stock) {
  stock.currentPrice = +(stock.currentPrice).toFixed(2);
  stock.change = +(stock.change).toFixed(2);
  stock.save();
}

//FUNCTIONS
function increasePriceOnBuy(stock) {
  if (stock.numberOfTeamsInPossession > 2) {
    console.log('Increasing price of ' + stock.name);
    stock.previousPrice = stock.currentPrice;
    stock.currentPrice *= 1.005;
    stock.change = (stock.currentPrice - stock.previousPrice) * 100 / stock.previousPrice;
    stock.save();
  } else {
  }
  Stocks.find({}, function(err, stocks) {
    io.sockets.emit('updateAll', {
      stocks: stocks
    });
  });
}

function decreasePriceOnBuy(stock) {
  if (stock.numberOfTeamsInPossession < 2) { //Doesn't require number of stocks to go to 0 when decreasing
    console.log('Decreasing price of ' + stock.name);
    stock.previousPrice = stock.currentPrice;
    stock.currentPrice *= 0.995;
    stock.change = (stock.currentPrice - stock.previousPrice) * 100 / stock.previousPrice;
    stock.save();
  } else {
  }
  Stocks.find({}, function(err, stocks) {
    io.sockets.emit('updateAll', {
      stocks: stocks
    });
  });
}

function updateStocks(stockName, action) {
  Stocks.findOne({name: stockName}, function (err, stock) {
    if (action === 'increase') {
      increasePriceOnBuy(stock);
      roundStockValue(stock);
    }
    else if (action === 'decrease') {
      decreasePriceOnBuy(stock);
      roundStockValue(stock);
    }
  });
  Stocks.find({}, function(err, stocks) {
    io.sockets.emit('updateAll', {
      stocks: stocks
    });
  });
}

function increaseTeamsInPossession(stockName, currentUser) {
  Stocks.findOne({name: stockName}, function (err, stock) {
    stock.numberOfTeamsInPossession += 1;
    stock.save();
    console.log(stock.name + '\'s number of teams: ' + stock.numberOfTeamsInPossession + ' with stock at ' + stock.currentPrice + ' and change at ' + stock.change); //THIS IS WRONG BECAUSE IT HAPPENS PRE INCREMENT OR DECREMENT
    if (currentUser.stocksBought[currentUser.stocksBought.findIndex(x => x.name == stockName)].numberOfStocks < 2) {
      updateStocks(stock.name, 'increase');
    }
  });
}

function decreaseTeamsInPossession(stockName, currentUser) {
  Stocks.findOne({name: stockName}, function (err, stock) {
    stock.numberOfTeamsInPossession -= 1;
    stock.save();
    console.log(stock.name + '\'s number of teams: ' + stock.numberOfTeamsInPossession + ' with stock at ' + stock.currentPrice + ' and change at ' + stock.change); //THIS IS WRONG BECAUSE IT HAPPENS PRE INCREMENT OR DECREMENT
    if (currentUser.stocksBought[currentUser.stocksBought.findIndex(x => x.name == stockName)].numberOfStocks < 2) {
      updateStocks(stock.name, 'decrease');
    }
  });
}

//Listening
var server = Server(app);

//Make new databse
mongoose.connect("mongodb://MINET:AbNovTeSleknan4@ds151082.mlab.com:51082/stox");
var db = mongoose.connection;
//If Mongo Error
db.on('error', console.error.bind(console, 'connection error'));

//Setting up sessions+cookies
var sessionMiddleware = session({
    secret: 'JagdishKumar',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    })
});

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

var User = require('./models/user');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var Stock = require('./models/stocks');

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

//Setting up body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//Setting public directory
app.use(express.static(__dirname + '/public'));

//Setting view engine
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');


var io = require('socket.io')(server);

io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

//SOCKETS CONNECT

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  if (socket.request.session.passport !== undefined) {
    User.findOne({username: socket.request.session.passport.user}, function (err, user) {
      if(!err) {
        Stocks.find({}, function(err, stocks) {
          socket.emit('update', {
            money: user.totalCurrent,
            stocksBought: user.stocksBought,
          });
          io.sockets.emit('updateAll', {
            stocks: stocks
          });
        });
      }
    });
  }

  socket.on('buy', function(data) { //When user buys a stock
    console.log(socket.request.session.passport);
    if (socket.request.session.passport !== undefined) {
      User.findOne({username: socket.request.session.passport.user}, function (err, user) {
        console.log(user);
        if (!user) {
          return res.redirect('/dashboard');
        } else { //If user exists

          var stockExists;
          if((user.stocksBought.findIndex(x => x.name == data.name) == -1)) {
            stockExists = false;
          } else {
            stockExists = true;
          }

          if(user.totalCurrent - parseInt(data.price) >= 0) { //If user has enough money
            if(stockExists) { //If he has 0 stocks of this kind
              if (user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks == 0) {
                increaseTeamsInPossession(data.name, user);
                user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks += 1;
              } else { //If he already owns this stock
                user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks += 1;
              }
            } else { //If he buys this stock for the first time
              increaseTeamsInPossession(data.name, user);
              user.stocksBought.push({
                name: data.name,
                numberOfStocks: 1
              });
            }
            user.totalCurrent -= parseInt(data.price);
          }

          user.save();

          Stocks.find({}, function(err, stocks) {
            socket.emit('update', {
              money: user.totalCurrent,
              stocksBought: user.stocksBought,
            });
            io.sockets.emit('updateAll', {
              stocks: stocks
            });
          });
          updateStocks();
        }
      });
    }
  });

  socket.on('sell', function(data) {//When user sells a stock

    if (socket.request.session.passport !== undefined) {
      User.findOne({username: socket.request.session.passport.user}, function (err, user) {
        if (!user) {
          return res.redirect('/dashboard');
        } else { //If user exists

          var stockExists;
          if((user.stocksBought.findIndex(x => x.name == data.name) == -1)) {
            stockExists = false;
          } else {
            stockExists = true;
          }

          if (stockExists) {

            if(user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks > 0) { //If he actually owns this stock
              if(user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks === 1) { //If he has exactly one stock
                decreaseTeamsInPossession(data.name, user);
                user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks -= 1;
              } else { //If he has more than one stock of this kind
                user.stocksBought[user.stocksBought.findIndex(x => x.name == data.name)].numberOfStocks -= 1;
              }
              user.totalCurrent += parseInt(data.price);
            }
          }

          user.save();

          Stocks.find({}, function(err, stocks) {
            socket.emit('update', {
              money: user.totalCurrent,
              stocksBought: user.stocksBought,
              stocks: stocks
            });
            io.sockets.emit('updateAll', {
              stocks: stocks
            });
          });
          updateStocks();
        }
      });
    }

  });

  socket.on('news', function(data) {

  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
  });
});


//Setting routes
var routes = require('./routes/index');
app.use('/', routes);


//404
app.use((res, req, next) => {
  var err = new Error('File not found!');
  err.status = 404;
  next(err);
});

//Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    title: 'Error',
    message: err.message,
    error: {}
  });
});

server.listen(process.env.PORT || 4000);
