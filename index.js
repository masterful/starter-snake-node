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

// =============================================================================
// ---                   SNAKE LOGIC GOES BELOW THIS LINE                    ---
// =============================================================================

// STATE/HISTORY:
let direction = 'up'; // default direction for snek is up
let BOARD_SIZE = 11;

class Map {
  constructor() {
    this.array = (new Int32Array(BOARD_SIZE * BOARD_SIZE)).fill(0);
  }

  get(x, y) {
    if (x < 0 || x >= BOARD_SIZE) { return -50; }
    if (y < 0 || y >= BOARD_SIZE) { return -50; }
    return this.array[y * BOARD_SIZE + x];
  }

  add(x, y, addition) {
    this.array[y * BOARD_SIZE + x] += addition;
  }

  reweigh() {
    const array = (new Int32Array(BOARD_SIZE * BOARD_SIZE)).fill(0);
    for (let x = 0; x < BOARD_SIZE; x ++) {
      for (let y = 0; y < BOARD_SIZE; y ++) {
        array[y * BOARD_SIZE + x] = this.get(x    , y - 1) * 0.5 // 🡡
                                  + this.get(x - 1, y    ) * 0.5 // 🡠
                                  + this.get(x    , y    )       // -
                                  + this.get(x + 1, y    ) * 0.5 // 🡢
                                  + this.get(x    , y + 1) * 0.5;// 🡣
      }
    }
    this.array = array;
  }

  print(head = {}) {
    console.log('');
    for (let y = 0; y < BOARD_SIZE; y ++) {
      const start = y * BOARD_SIZE;
      const row = Array.from(this.array.slice(start, start + BOARD_SIZE));
      if (head.y === y) { row[head.x] = 'x'; }
      console.log(row.map(i => i.toString().padStart(4)).join(' '));
    }
  }
}

// Simple routes:
app.post('/start', (req, res) => {
  // Update our board:
  const { width = 11 } = req.body.board || {};
  // Boards are presumed to be square
  BOARD_SIZE = width;

  return res.json({ color: '#ffa500', headType: 'pixel', tailType: 'block-bum' });
});
app.post('/end', (_, res) => res.json({}));
app.post('/ping', (_, res) => res.json({}));

// Handle POST request to '/move'
app.post('/move', async (request, response) => {
  // By default, continue in the direction we were going:
  let move = direction;

  // Build a map of the board, and then flood fill it to find a nice route
  const map = new Map();
  // Put the snek bodies in the map:
  const { snakes = [] } = request.body.board || {};
  snakes.forEach(({ body }) => {
    body.forEach(({ x, y }) => map.add(x, y, -30));
  });
  // Only if we're low enough on health, should we add food as an incentive
  const { health = 100 } = request.body.you || {};
  if (health < 30) {
    const { food = [] } = request.body.board || {};
    food.forEach(({ x, y }) => map.add(x, y, 20));
  }

  // However, if it looks like the square in our future path is, or will be,
  // occupied by a wall or another snek, then we should change direction:
  const [{ x, y }] = (request.body.you || {}).body || [{ x: 0, y: 0 }];

  // Update the map by weighing neighbours:
  map.print({ x, y });
  map.reweigh();
  map.print({ x, y });

  const directions = [
    { value: 'up',    opposite: 'down',   weight: map.get(x, y - 1) },
    { value: 'down',  opposite: 'up',     weight: map.get(x, y + 1) },
    { value: 'left',  opposite: 'right',  weight: map.get(x - 1, y) },
    { value: 'right', opposite: 'left',   weight: map.get(x + 1, y) },
  ];
  // Which direction should we go?
  // (Obviously not the opposite direction)
  directions.find(direction => direction.opposite === move).weight = -Infinity;
  move = directions.reduce((a, b) => (a.weight > b.weight ? a : b)).value;

  // Update our direction:
  direction = move;
  return response.json({ move });
});

// =============================================================================
// ---                   SNAKE LOGIC GOES ABOVE THIS LINE                    ---
// =============================================================================

app.use('*', fallbackHandler);
app.use(notFoundHandler);
app.use(genericErrorHandler);

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'));
});
