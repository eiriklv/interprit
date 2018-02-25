/**
 * Import dependencies
 */
const uuid = require('uuid');

/**
 * Import effects
 */
const {
  call,
  callProc,
} = require('../../lib/effects');

/**
 * Import model selectors
 */
const {
  getNextPlayer,
  getWinner,
  getAvailableTiles,
  isFinished,
} = require('./models');

/**
 * Import action creators
 */
const {
  commandTypes,
  commandCreators,
  eventTypes,
  eventCreators,
} = require('./actions');

/**
 * Import processes
 */
const { celebrateWinner } = require('./processes');

/**
 * Command handlers
 *
 * NOTE: The command handlers return events generated from
 * the command and the current state or aborts if it fails any invariants
 */
const commandHandlers = module.exports.commandHandlers = {
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
module.exports.getCommandHandlerByType = function getCommandHandlerByType(type) {
  return commandHandlers[type] || commandHandlers.default;
}

/**
 * Event handlers
 *
 * NOTE: The event handlers generate and trigger
 * effects based on the event and the current state
 */
const eventHandlers = module.exports.eventHandlers = {
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
module.exports.getEventHandlerByType = function getEventHandlerByType(type) {
  return eventHandlers[type] || eventHandlers.default;
}
