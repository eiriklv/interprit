/**
 * Import event types
 */
const { eventTypes } = require('./actions');

/**
 * Import model utilities
 */
const { createGame, getNextPlayer, fillTile } = require('./models');

/**
 * Create initial state
 */
const initialState = createGame();

/**
 * State update logic (just a reducer)
 */
const gameProjection = module.exports.gameProjection = (state = initialState, event = {}) => {
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
