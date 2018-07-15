// init project
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
// const glitchup = require('glitchup');
const { WebClient } = require('@slack/client');
const expressNunjucks = require('express-nunjucks');
const fetch = require('node-fetch');


// consts
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN;

// global state (prob a bad idea)
const slack = new WebClient(slackAccessToken);
const spotifyApi = new SpotifyWebApi({
  clientId : process.env.SPOTIFY_CLIENT_ID,
  clientSecret : process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri : `https://${process.env.PROJECT_NAME}.glitch.me/spotify/callback`
});
let spotifyTokenExpirationEpoch = undefined;

// initialze express app
const app = express();
app.set('views', `${__dirname}/templates`);


const njk = expressNunjucks(app, {
  watch: false,
  noCache: false
});

// home page
app.get('/', (req, res) => {
  const response = {};
  const hasSpotifyToken = spotifyApi.getAccessToken();
  response.spotifyMessage = hasSpotifyToken ? 'An access token was found.\n' : 
    '<a href="/spotify/authorize" class="f4 fw6 db black link hover-blue">Authorize</a>';
  
  response.slackMessage = slackAccessToken ? 'An access token is stored.\nWe Gucci.' : 'No access token found 😪.';
  if(hasSpotifyToken && slackAccessToken) response.showLink = true;
  res.render('index', response);
});

app.get('/spotify/authorize', (req, res) => {
  // TODO: not using state param is probably another bad idea
  const authorizeURL = spotifyApi.createAuthorizeURL(['user-read-playback-state']);
  res.redirect(authorizeURL);
});

app.get('/spotify/callback', (req, res) => {
  const authorizationCode = req.query.code;
  spotifyApi.authorizationCodeGrant(authorizationCode)
    .then((data) => {
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
      // Save the amount of seconds until the access token expired
      spotifyTokenExpirationEpoch = (new Date().getTime() / 1000) + data.body['expires_in'];
    
      console.log('Retrieved token. It expires in ' + Math.floor(spotifyTokenExpirationEpoch - new Date().getTime() / 1000) + ' seconds!');
    })
    .then(() => {
      res.redirect('/update');
    })
    .catch((error) => res.render('error', { error }));
});

app.get('/update', (req, res) => {
  
    const response = {};
    // fail fast when there's no tokens
    if (!spotifyApi.getAccessToken() || !slackAccessToken) {
      console.log('Not logged in!');
      response.error = '<h2>Tokens are not available</h2><a href="/" class="f4 fw6 db black link hover-blue">Reauthenticate</a>';
      res.render('error', response);
    }
    else {
      // make sure the spotify token is current
      Promise.resolve(true)
        .then(() => {
          if ((new Date().getTime() / 1000) > spotifyTokenExpirationEpoch) {
            console.log(`Refreshing token that will expire in ${spotifyTokenExpirationEpoch}`);
            return spotifyApi.refreshAccessToken()
              .then((data) => {
                spotifyApi.setAccessToken(data.body['access_token']);
                spotifyApi.setRefreshToken(data.body['refresh_token']);
                spotifyTokenExpirationEpoch = (new Date().getTime() / 1000) + data.body['expires_in'];
                return spotifyApi.getAccessToken();
              });
          } else {
            return spotifyApi.getAccessToken();
          }
        })
        // TODO: we don't actually need the token
        .then(() => spotifyApi.getMyCurrentPlaybackState())
        .then((data) => {
          if (data.body.is_playing) {
            const artist = data.body.item.artists.map(a => a.name).join(', ');
            const logText = `${data.body.item.name} - ${artist}`;
            const album = data.body.item.album;

            const { url, width, height } = album.images[1];

            response.albumCover = {
              url,
              width,
              height,
            };

            response.album =  album.name;
            response.spotifyLink = data.body.item.external_urls.spotify;
            response.track = data.body.item.name;
            response.trackId = data.body.item.id;
            response.artist = artist;

            console.log('track:', logText);
            return slack.users.profile.set({ profile: { status_text: logText, status_emoji: ':headphones:' } });
          } else {
            console.log('no track playing');
          }
        })
        .then(() => {
          response.success = '<h1>Update success</h1>';
          res.render('update', response);
        })
        .catch((error) => res.render('error', { error }));
        
    };
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
  pollFetch('/update/');
});

const pollFetch = (path = '/') => setInterval(() => {
  const fullPath = `https://${process.env.PROJECT_NAME}.glitch.me${path}`;
  fetch(fullPath)
    .then((res) => res.text())
    .catch(err => console.error(err));
}, 30000);
