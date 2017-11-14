var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require("../models/user");
var Stocks = require("../models/stocks");
var News = require("../models/news");

//Render home page
router.get('/', (req, res, next) => {
  if(!req.user) {
    return res.redirect('/login');
  } else {
    Stocks.find().sort('-name').exec(function(err, stocks) {
      News.find().sort('-time').exec(function(err, news) {
        return res.render('index', {stocks: stocks, news: news});
      });
    });
  }
});

//Render login page
router.get('/login', (req, res, next) => {
  if (req.user) {
    return res.redirect('/');
  }
  return res.render('login');
});

//LOGIN user
router.post('/login', (req, res, next) => {
  passport.authenticate('local', function(err, user) {
    if (err) {
      return res.render('login', { error : err.message });
    }
    if (!user) {
      return res.render('login', { error : 'Invalid credentials.' });
    }
    req.logIn(user, function(err) {
      return res.redirect('/');
    });
  })(req, res, next);
});

//LOGOUT user
router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

//Render register page
router.get('/register', (req, res, next) => {
  return res.render('register');
});

//REGISTER user
router.post('/register', function(req, res) {
  User.register(new User({
    username : req.body.username,
    password: req.body.password
  }), req.body.password, function(err, user) {
    if (err) {
      return res.render('register', { error : 'That team-name has already been taken.' });
    }
    return res.render('register', { error : 'Team registered successfully.' });
  });
});

//Render register page
router.get('/stock', (req, res, next) => {
  return res.render('stock');
});

//REGISTER user
router.post('/stock', function(req, res) {
  var stockData = {
    name : req.body.stockName,
    symbol: req.body.stockSymbol,
    currentPrice: req.body.stockPrice,
    previousPrice: req.body.stockPrice
  }
  Stocks.create(stockData, (error, stock) => {
    if (error) {
      return res.render('stock', { error : error });
    } else {
      return res.render('stock', { error : 'Stock registered successfully.' });
    }
  });
});

//Render register page
router.get('/news', (req, res, next) => {
  Stocks.find().sort('-name').exec(function(err, stocks) {
    return res.render('news', { stocks: stocks });
  });
});

//REGISTER user
router.post('/news', function(req, res) {
  var newsData = {
    name: req.body.stockName,
    action: req.body.typeOfNews,
    time: new Date()
  }
  News.create(newsData, (error, news) => {
    if (error) {
      Stocks.find().sort('-name').exec(function(err, stocks) {
        return res.render('news', { error : error, stocks: stocks });
      });
    } else {
      Stocks.find().sort('-name').exec(function(err, stocks) {
        return res.render('news', { error : 'News created successfully.', stocks: stocks });
      });
    }
  });
});


module.exports = router;
