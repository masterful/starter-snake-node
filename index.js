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

// Given a map and position, this determines if you can
// proceed safely in the given direction
function isClear({ map, x, y, move }) {
  // Going UP
  if (move === 'up') {
    // Is something there right now?
    const occupied = map[(y - 1) * BOARD_SIZE + x];
    if (occupied === 1) { return false; }
  // Going DOWN
  } else if (move === 'down') {
    // Is something there right now?
    const occupied = map[(y + 1) * BOARD_SIZE + x];
    if (occupied === 1) { return false; }
  // Going LEFT
  } else if (move === 'left') {
    // Is something there right now?
    const occupied = map[y * BOARD_SIZE + x - 1];
    if (occupied === 1) { return false; }
  // Going RIGHT
  } else if (move === 'right') {
    // Is something there right now?
    const occupied = map[y * BOARD_SIZE + x + 1];
    if (occupied === 1) { return false; }
  }
  // default true:
  return true;
}

// STATE/HISTORY:
const state = {
  direction: 'up', // default direction for snek is up
};
let BOARD_SIZE = 11;

// Simple routes:
app.post('/start', (req, res) => {
  console.log(JSON.stringify(req.body));
  // Update our board:
  const { board } = req.body;
  // Boards are presumed to be square (we add 2 for the fence on either side).
  BOARD_SIZE = board.width + 2;

  return res.json({ color: '#ffa500', headType: 'pixel', tailType: 'block-bum' });
});
app.post('/end', (_, res) => res.json({}));
app.post('/ping', (_, res) => res.json({}));

// Handle POST request to '/move'
app.post('/move', (request, response) => {
  // By default, continue in the direction we were going:
  let move = state.direction;

  // Build up a list of occupied squares:
  const { you: { body: [head] }, board: { food, snakes } } = request.body;
  // We add a fence along the edges that's "occupied" to make the avoidance logic
  // below a little simpler:
  const map = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  for (let i = 0; i < BOARD_SIZE; i ++) {
    // top fence:
    map[i] = 1;
    // bottom fence:
    map[(BOARD_SIZE - 1) * BOARD_SIZE + i] = 1;
    // left fence:
    map[BOARD_SIZE * i] = 1;
    // right fence:
    map[(BOARD_SIZE * (i + 1)) - 1] = 1;
  }
  // Put the snek bodies in the map:
  snakes.forEach(({ body }) => {
    body.forEach(({ x, y }) => (map[(y + 1) * BOARD_SIZE + (x + 1)] = 1));
  });

  // However, if it looks like the square in our future path is, or will be,
  // occupied by a wall or another snek, then we should change direction:
  const x = head.x + 1;
  const y = head.y + 1;
  // Are we clear?
  if (!isClear({ map, x, y, move })) {
    // Crap - which direction do we go, then?
    if (move === 'up' || move === 'down') {
      // try left:
      move = 'left';
      if (!isClear({ map, x, y, move })) {
        // okay, last resort, turn right:
        move = 'right';
      }
    } else {
      // try up:
      move = 'up';
      if (!isClear({ map, x, y, move })) {
        // okay, last resort, turn down:
        move = 'down';
      }
    }
  }

  // Update our direction:
  state.direction = move;
  return response.json({ move });
})


// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler);
app.use(notFoundHandler);
app.use(genericErrorHandler);

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'));
});
