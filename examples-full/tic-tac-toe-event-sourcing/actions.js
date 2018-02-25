/**
 * Import dependencies
 */
const uuid = require('uuid');

/**
 * Import effects
 */
const { call, callProc } = require('../../lib/effects');

/**
 * Import model selectors
 */
const {
  getNextPlayer,
  getWinner,
  getAvailableTiles,
} = require('./models');

/**
 * System command types - actions that trigger sagas
 */
const commandTypes = module.exports.commandTypes = {
  FILL_TILE_COMMAND: 'FILL_TILE_COMMAND',
  RESTART_GAME_COMMAND: 'RESTART_GAME_COMMAND',
};

/**
 * System event types - actions that trigger state changes
 */
const eventTypes = module.exports.eventTypes = {
  FILL_TILE_EVENT: 'FILL_TILE_EVENT',
  RESTART_GAME_EVENT: 'RESTART_GAME_EVENT',
};

/**
 * Command creators
 */
 const commandCreators = module.exports.commandCreators = {
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
const eventCreators = module.exports.eventCreators = {
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
