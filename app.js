var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var instagram = require('instagram-node');
var conf = require('./conf');
var MongoStore = require('connect-mongo')(express);

var app = express(),
  server = http.createServer(app),
  io = require('socket.io').listen(server);

// all environments
// middleware stuff
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: 'Node Rocks',
  store: new MongoStore({
    db: conf.mongo_db,
    url: conf.mongo_uri
   })
}));
app.use(express.methodOverride());
app.use(function(req, res, next) {
  var ig = instagram.instagram();

  if (req.session.user && req.session.user.accessToken) {
    ig.use({access_token: req.session.user.accessToken});
  } else {
    ig.use(conf.instagram);
  }

  req.ig = ig;
  next();
});
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

routes.create(app, io);

//we don't need this cuz we are gunna handle routing in index.js
//app.get('/', routes.index);
//app.get('/users', user.list);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});