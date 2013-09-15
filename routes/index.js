var conf = require('../conf'),
  db = require('../models'),
  Instastream = require('insta-stream');

var is = new Instastream(conf.instagram);

module.exports.create = function(app, io) {
  app.get('/', function(req, res) {
    req.session.user = null;

    res.render('index', {
      title: "Home"
    });
  });

  app.get('/explore', function(req, res) {
    req.ig.media_popular(function(err, medias, limit) {
      if (err) {
        console.log(err);
        return next(err);
      }
      console.log(require('util').inspect(medias));
      res.render('explore', {
        title: 'explore',
        medias: medias
      });
    });
  });

  app.get('/location/:latitude/:longitude', function(req, res, next) {
    var lat = Number(req.param('latitude'));
    var lng = Number(req.param('longitude'));
    var user = req.session.user;

    req.ig.media_search(lat, lng, function(err, medias, limit) {
      if (err) {
        console.log(err);
        return next(err);
      }

      is.search({ lat: lat, lng: lng, distance: 5000 }, function(stream) {
        io.of('/' + user.id).on('connection', function(socket) {
          stream.on('data', function(medias) {
            socket.emit('data', encode(medias));
          })
        })
      });

      res.render('location', {
        title: 'location',
        medias: medias,
        lat: lat,
        lng: lng,
        user: user,
        host: conf.host
      });
    });
  });

  app.get('/authorize', function(req, res, next) {
    res.redirect(req.ig.get_authorization_url(conf.host + '/handleAuth', { scope: ['basic'], state: 'a state' }));
  });

  app.get('/handleAuth', function(req, res, next) {
    req.ig.authorize_user(req.query.code, conf.host + '/handleAuth', function(err, result) {
      if (err) {
        console.log(err);
        return next(err);
      }

      var username = result.user.username;
      db.User.findOne({username: username}, function(err, user) {
        if (err) {
          console.log(err);
          return next(err);
        }

        if (!user) {
          user = new db.User();
          user.username = username;
        }

        user.bio = result.user.bio;
        user.accessToken = result.access_token;
        user.profileImage = result.user.profile_picture;
        user.name = result.user.full_name;
        user.id = result.user.id;

        user.save(function(err) {
          if (err) {
            console.log(err);
            return next(err);
          }

          req.session.user = user;

          res.redirect('/explore');
        });
      });

      // console.log(require('util').inspect(result));
      // res.json(result);
    });
  });

  app.get('/followers', function(req, res, next) {
    var user = req.session.user;
    console.log(user);

    req.ig.user_followers(user.id, function(err, followers, pagination, limit) {
      if (err) {
        console.log(err);
        return next(err);
      }

      req.ig.user_follows(user.id, function(err, follows, pagination, limit) {
        if (err) {
          console.log(err);
          return next(err);
        }

        console.log(require('util').inspect(follows));

        res.render('followers', {
          followers: followers,
          follows: follows,
          title: 'Follwers page'
        });
      });
    });
  });

  app.get('/follow/:userId', function(req, res, next) {
    var user = req.session.user;

    req.ig.user_media_recent(req.params.userId, function(err, medias) {
      if (err) {
        console.log(err);
        return next(err);
      }

      var location;
      for (var i = 0; i < medias.length; i++) {
        var currentMedia = medias[i];
        if (currentMedia.location && currentMedia.location.latitude && currentMedia.location.longitude) {
          if (!location) {
            location = {
              latitude: currentMedia.location.latitude,
              longitude: currentMedia.location.longitude
            };
          }
        }
      }

      if (location) {
        res.redirect('/location/' + location.latitude + '/' + location.longitude);
      } else {
        res.send('User has no location');
      }
    });
  });
};