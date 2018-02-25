/**
 * Import utilities
 */
const {
  transpose,
  flipVertically,
  flipHorizonally,
  getDiagonals,
  flatten,
  getUnique,
  getRandom,
  frequency,
  isFilled,
  values,
} = require('./utilities');

/**
 * Constructor function to create a new game
 */
const createGame = module.exports.createGame = function createGame() {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
}

/**
 * Selector function to get the winner
 */
const getWinner = module.exports.getWinner = function getWinner(game) {
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
const isFinished = module.exports.isFinished = function isFinished(game) {
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
const getNextPlayer = module.exports.getNextPlayer = function getNextPlayer(game) {
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
const getAvailableTiles = module.exports.getAvailableTiles = function getAvailableTiles(game) {
  return flatten(game)
  .reduce((result, tile, index) => tile ? result : [...result, index], []);
}

/**
 * Update function to fill a tile on the game board
 */
const fillTile = module.exports.fillTile = function fillTile({ player, index }, game) {
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
