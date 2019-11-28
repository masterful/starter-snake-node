const bodyParser = require('body-parser');
const express = require('express');
const logger = require('morgan');
const app = express();
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js');

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 5000));

app.enable('verbose errors');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(poweredByHandler);

// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Simple routes:
app.post('/start', (_, res) => res.json({ color: '#ffa500', headType: 'pixel', tailType: 'block-bum' }));
app.post('/end', (_, res) => res.json({}));
app.post('/ping', (_, res) => res.json({}));

// Handle POST request to '/move'
app.post('/move', (request, response) => {
  console.log(request);
  let [move] = ['up', 'down', 'left', 'right'].splice((Math.random() * 1000) % 4, 1);

  return response.json({ move });
})


// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler);
app.use(notFoundHandler);
app.use(genericErrorHandler);

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'));
});
