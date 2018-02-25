'use strict';

/**
 * Depedencies
 */
const uuid = require('uuid');

/**
 * Effects
 */
const {
  call,
  delay,
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
  actionChannel,
  takeChannel,
  spawn,
  select,
} = require('../lib/effects');

/**
 * TODO: Add request-response semantics for commands,
 * TODO: Use IOWithStates to calculate transitions instead of using local state for every process
 */

/**
 * Import interpreter creator
 */
const createInterpreter = require('../lib/interpreter');

/**
 * Import IO creator
 */
const { createIO, createIOWithStateTransitions } = require('../lib/io');

/**
 * System command types - actions that trigger sagas
 */
const commandTypes = {
  FILL_TILE_COMMAND: 'FILL_TILE_COMMAND',
  RESTART_GAME_COMMAND: 'RESTART_GAME_COMMAND',
};

/**
 * System event types - actions that trigger state changes
 */
const eventTypes = {
  FILL_TILE_EVENT: 'FILL_TILE_EVENT',
  RESTART_GAME_EVENT: 'RESTART_GAME_EVENT',
};

/**
 * Command creators
 */
const commandCreators = {
  fillTile: (index) => ({
    id: uuid.v4(),
    type: commandTypes.FILL_TILE_COMMAND,
    index,
  }),
  restartGame: () => ({
    id: uuid.v4(),
    type: commandTypes.RESTART_GAME_COMMAND,
  }),
};

/**
 * Event creators
 */
const eventCreators = {
  fillTile: (index) => ({
    id: uuid.v4(),
    type: eventTypes.FILL_TILE_EVENT,
    index,
  }),
  restartGame: () => ({
    id: uuid.v4(),
    type: eventTypes.RESTART_GAME_EVENT,
  }),
};

/**
 * Commands callable as functions (that we pass to the UI)
 * NOTE: Not in use yet (must have vdom renderer ready)
 */
const commands = {
  fillTile: (index) => io.dispatch(commandCreators.fillTile(index)),
  restartGame: () => io.dispatch(commandCreators.restartGame()),
}

/**
 * Function to transpose a 2D array (M x N dimensional)
 */
function transpose(arr) {
  return arr[0].map((item, index) => arr.map((x) => x[index]));
}

/**
 * Function to flip a 2D array vertically (M x N dimensional)
 */
function flipVertically(arr) {
  return arr.slice().reverse();
}

/**
 * Function to flip a 2D array horizonally (M x N dimensional)
 */
function flipHorizonally(arr) {
  return arr.map(line => line.slice().reverse());
}

/**
 * Function to get the diagonals of 2D arrays (N x N dimensional)
 */
function getDiagonals(arr) {
  return [
    arr[0].map((item, index) => arr[index][index]),
    arr[0].map((item, index) => flipVertically(arr)[index][index]),
  ];
}

/**
 * Function to flatten a 2D array to 1D
 */
function flatten(arr) {
  return arr.reduce((result, line) => [...result, ...line], []);
}

/**
 * Function to keep only unique elements of an array
 */
function getUnique(arr) {
  return arr.reduce((result, item) => {
    return result.includes(item) ? result : [...result, item];
  });
}

/**
 * Function to get a random element from an array
 */
function getRandom(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

/**
 * Function to get the frequencies of an array
 */
function frequency(arr) {
  return arr.reduce((result, item) => {
    return {
      ...result,
      [item]: (result[item] || 0) + 1
    };
  }, {});
}

/**
 * Function to check if an array is only filled with truthy values
 */
function isFilled(arr) {
  return arr.every(item => item);
}

/**
 * Function to get the values of an object
 */
function values(obj) {
  return Object.keys(obj).map(key => obj[key]);
}

/**
 * Constructor function to create a new game
 */
function createGame() {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
}

/**
 * Selector function to get the winner
 */
function getWinner(game) {
  /**
   * Generate all lines of the game
   */
  const lines = [
    ...game,
    ...transpose(game),
    ...getDiagonals(game),
  ];

  /**
   * Get any filled lines
   */
  const filledLines = lines.filter(isFilled);

  /**
   * Return if the game is finished
   */
  return filledLines.reduce((winner, line) => {
    return winner || (getUnique(line).length === 1 ? getUnique(line)[0] : null);
  }, null);
}

/**
 * Selector function to check if game has finished
 */
function isFinished(game) {
  /**
   * Check if board is filled
   */
  const everyLineInGameIsFilled = game.every(isFilled);

  /**
   * Check if there is a winner
   */
  const hasWinner = !!getWinner(game);

  /**
   * The game is finished either if all the
   * tiles are filled or we have winner
   */
  return everyLineInGameIsFilled || hasWinner;
}

/**
 * Selector function to get who's turn it is (we'll assume that 'x' always start)
 */
function getNextPlayer(game) {
  /**
   * Flatten the game board to a 1D array for easier processing
   */
  const tiles = flatten(game);

  /**
   * Get the frequency of each player on the board
   */
  const {
    x = 0,
    o = 0,
  } = frequency(tiles);

  /**
   * Create e representation of the player frequencies for further processing
   */
  const players = { o, x };

  /**
   * Return the symbol of the next player
   */
  return Object.keys(players)
  .filter(x => x)
  .reduce((nextPlayer, player) => {
    const count = players[player];
    return count <= nextPlayer.count ? { player, count } : nextPlayer;
  }, { player: 'none', count: Infinity }).player;
}

/**
 * Selector function to get the available tiles (indices of a 1D array)
 */
function getAvailableTiles(game) {
  return flatten(game)
  .reduce((result, tile, index) => tile ? result : [...result, index], []);
}

/**
 * Update function to fill a tile on the game board
 */
function fillTile({ player, index }, game) {
  /**
   * Flatten the game board to a 1D array
   */
  const flattenedGame = flatten(game);

  /**
   * Update the indexed tile
   */
  const updatedFlattenedGame = [
    ...flattenedGame.slice(0, index),
    player,
    ...flattenedGame.slice(index + 1)
  ];

  /**
   * Return an updated game board transformed back to a 2D array
   */
  return game[0].map((_, index) => {
    return updatedFlattenedGame.slice(index * game.length, (index + 1) * game.length);
  });
}

/**
 * Initial state representation
 */
const initialState = createGame();

/**
 * State update logic (just a reducer)
 */
const updateState = (state = initialState, event = {}) => {
  switch (event.type) {
    case eventTypes.FILL_TILE_EVENT:
    const { index } = event;
    const player = getNextPlayer(state);
    return fillTile({ player, index }, state);

    case eventTypes.RESTART_GAME_EVENT:
    return createGame();

    default:
    return state;
  }
};

/**
 * Create an IO interface to pass to
 * the interpreter for handling take/put
 */
const io = createIOWithStateTransitions(updateState);

/**
 * Create an interpreter based on the effects resolvers and IO chosen
 */
const interpreter = createInterpreter({
  call,
  delay,
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
  actionChannel,
  takeChannel,
  spawn,
  select,
}, io, [], () => {});

/**
 * Event handlers
 *
 * NOTE: The event handlers generate and trigger
 * effects based on the event and the current state
 */
const eventHandlers = {
  *[eventTypes.FILL_TILE_EVENT](event, currentState, previousState) {
    /**
     * Use selectors to query state / models so we can make decisions
     */
    const currentPlayer = getNextPlayer(previousState);
    const nextPlayer = getNextPlayer(currentState);
    const finished = isFinished(currentState);
    const winner = getWinner(currentState);

    /**
     * Create effect based on the event and state
     */
    const effects = [];

    if (finished && winner) {
      effects.push(call(console.log, `player ${winner} won!`));
      effects.push(callProc(celebrateWinner));
    }

    if (finished && !winner) {
      effects.push(call(console.log, `it's a tie!`));
    }

    if (!finished) {
      effects.push(call(console.log, `next round for player ${nextPlayer}!`));
    }

    /**
     * Perform effects (in series)
     */
    for (let effect of effects) {
      yield effect;
    }
  },
  *[eventTypes.RESTART_GAME_EVENT](event, currentState, previousState) {
    /**
     * Create effect based on the event and state
     */
    const effects = [
      call(console.log, `game was restarted!`),
    ];

    /**
     * Perform effects (in series)
     */
    for (let effect of effects) {
      yield effect;
    }
  },
  *default({ type }) {
    /**
     * Do nothing if the event has no handler
     */
  },
};

/**
 * Event handler resolver
 */
function getEventHandlerByType(type) {
  return eventHandlers[type] || eventHandlers.default;
}

/**
 * Command handlers
 *
 * NOTE: The command handlers return events generated from
 * the command and the current state or aborts if it fails any invariants
 */
const commandHandlers = {
  *[commandTypes.FILL_TILE_COMMAND](command, state) {
    /**
     * NOTE: Check invariants and rules against state
     * NOTE: Use selectors on the state / models
     */
    const nextPlayer = getNextPlayer(state);
    const availableTiles = getAvailableTiles(state);

    /**
     * Check if the chosen tile is available
     */
    const { index } = command;
    const isValidTileChoice = availableTiles.includes(index);

    if (!isValidTileChoice) {
      return [new Error(`The tile index ${index} is not a valid choice!`)]
    }

    /**
     * Create resulting events
     */
    const events = [eventCreators.fillTile(index)];

    /**
     * Return resulting event(s)
     */
    return [null, events];
  },
  *[commandTypes.RESTART_GAME_COMMAND](command, state) {
    /**
     * NOTE: Check invariants and rules against state
     * NOTE: Use selectors on the state / models
     */

    /**
     * Create resulting events
     */
    const events = [eventCreators.restartGame()];

    /**
     * Return resulting event(s)
     */
    return [null, events];
  },
  *default({ type }) {
    /**
     * Abort / throw error if the command has no handler
     */
    return [new Error(`Unrecognized command of type ${type} supplied - Did you forget to add it to the handler map?`)];
  },
};

/**
 * Command handler resolver
 */
function getCommandHandlerByType(type) {
  return commandHandlers[type] || commandHandlers.default;
}

/**
 * Subprocess for celebrating winner
 */
function* celebrateWinner() {
  /**
   * Keep a count of our celebrations
   */
  let celebrations = 0;

  /**
   * Do some fancy logic (short or long running)
   */
  while (celebrations < 5) {
    yield call(console.log, `🎉`);
    yield delay(300);
    celebrations++;
  }

  yield call(console.log, 'celebration done!');

  /**
   * Trigger a command
   */
  yield put(commandCreators.restartGame());
}

/**
 * Board rendering procedure
 */
function* renderGameBoard(game) {
  yield putStream(process.stdout, `\n`);
  yield putStream(process.stdout, `${game[0][0] || ' '}|${game[0][1] || ' '}|${game[0][2] || ' '}\n`);
  yield putStream(process.stdout, `-+-+-\n`);
  yield putStream(process.stdout, `${game[1][0] || ' '}|${game[1][1] || ' '}|${game[1][2] || ' '}\n`);
  yield putStream(process.stdout, `-+-+-\n`);
  yield putStream(process.stdout, `${game[2][0] || ' '}|${game[2][1] || ' '}|${game[2][2] || ' '}\n\n`);
}

/**
 * Input loop
 *
 * NOTE: This is where you listen to all types of events which
 * can trigger effects in your system (listening to the outside world)
 */
function* inputLoop() {
  /**
   * Listen to external events and then trigger puts when something happens
   *
   * TODO: Use pattern matching
   */
  while (true) {
    const data = yield takeStream(process.stdin);
    const input = data.toString().trim();

    switch (input) {
      case 'help':
      yield putStream(process.stdout, `> the available commands are \n- start\n- restart\n`);
      break;

      case 'start':
      case 'restart':
      yield put(commandCreators.restartGame());
      break;

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      yield put(commandCreators.fillTile(+input));
      break;

      default:
      yield putStream(process.stdout, `invalid command input => ${command || 'blank'}\n`);
      break;
    }
  }
}

/**
 * Render loop
 */
function* renderLoop() {
  /**
   * Create a channel to queue up all incoming events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Listen for events and render the current state
   */
  while (true) {
    /**
     * Get the current state
     */
    const state = yield select();

    /**
     * Render the app
     */
    yield callProc(renderGameBoard, state);

    /**
     * Wait for the next event
     */
    const event = yield takeChannel(eventChannel);
  }
}

/**
 * Event loop
 */
function* eventLoop() {
  /**
   * Create a channel for listening for events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Process events and trigger effects
   */
  while (true) {
    /**
     * Take the next event from the channel / queue
     */
    const [event, currentState, previousState] = yield takeChannel(eventChannel);

    /**
     * Get the appropriate event handler
     */
    const handleEvent = getEventHandlerByType(event.type);

    /**
     * Handle the event and trigger the appropriate effects
     */
    yield callProc(handleEvent, event, currentState, previousState);
  }
}

/**
 * Command lopp
 */
function* commandLoop() {
  /**
   * Create a channel to queue up all incoming commands
   */
  const commandChannel = yield actionChannel('*_COMMAND');

  /**
   * Listen for command and handle them sequentially
   */
  while (true) {
    /**
     * Wait for the next command
     */
    const [command, state] = yield takeChannel(commandChannel);

    /**
     * Get the appropriate command handler
     */
    const handleCommand = getCommandHandlerByType(command.type);

    /**
     * Handle the command and capture the generated events
     */
    const [error, events = []] = yield callProc(handleCommand, command, state);

    /**
     * If the command could not be processed
     */
    if (error) {
      yield call(console.log, `Command ${command.type} failed with reason: ${error.message}`);
      continue;
    }

    /**
     * Put the events into the system for other remote consumers
     */
    for (let event of events) {
      yield put(event);
    }
  }
}

/**
 * Main process
 */
function* main() {
  yield parallel([
    callProc(inputLoop),
    callProc(renderLoop),
    callProc(eventLoop),
    callProc(commandLoop),
  ]);
}

/**
 * Run the main process
 */
interpreter(main);

/**
 * Thoughts:
 *
 * You don't really need redux and middleware anymore
 * when you can just set up sagas that can to all kinds of things to actions.
 *
 * As long as you have a way of put-ing actions
 * into the system and take-ing actions from the
 * system you can do anything you want.
 *
 * The system also does not really need a getState,
 * as any part that want to maintain some kind of
 * state can just listen for all actions and derive
 * its own state kept locally.
 *
 * Replaced redux with a simple IO implementation
 * that enables you to dispatch and subscribe to the system
 */
