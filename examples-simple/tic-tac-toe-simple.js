'use strict';

/**
 * Import dependencies
 */
const util = require('util');

/**
 * Effects
 */
const {
  delay,
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
  pauseStream,
} = require('../lib/effects');

/**
 * Import interpreter creator
 */
const createInterpreter = require('../lib/interpreter');

/**
 * Import IO creator
 */
const { createIO } = require('../lib/io');

/**
 * Create an IO interface to pass to
 * the interpreter for handling take/put
 */
const io = createIO();

/**
 * Create debug context object
 */
const debugContext = {};

/**
 * Create an interpreter based on the effects resolvers and IO chosen
 */
const interpreter = createInterpreter({
  delay,
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
  pauseStream,
}, io);

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
 * Board rendering function
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
 * Game loop saga
 */
function* gameLoop() {
  /**
   * Game state
   */
  let game = createGame();

  /**
   * Game logic / control flow
   * NOTE: We'll continue playing until someone wins or the game board is filled
   */
  while (!isFinished(game)) {
    /**
     * Render the game board
     */
    yield callProc(renderGameBoard, game);

    /**
     * Get the next player
     */
    const nextPlayer = getNextPlayer(game);

    /**
     * Get the available tiles
     */
    const availableTiles = getAvailableTiles(game);

    /**
     * Tell the player to choose a tile index and wait for input
     */
    yield putStream(process.stdout, `Player ${nextPlayer} - choose a tile by index\n`);

    /**
     * Get the tile chosen by the player from the input stream
     */
    const chosenTileIndex = +(yield takeStream(process.stdin));

    /**
     * Check if the chosen tile is available for filling
     */
    if (!availableTiles.includes(chosenTileIndex)) {
      yield putStream(process.stdout, `Invalid tile index chosen\n\n`);
      continue;
    }

    /**
     * Update the game state based on the tile chosen
     */
    game = fillTile({
      player: nextPlayer,
      index: chosenTileIndex,
    }, game);
  }

  /**
   * Render the end game board
   */
  yield callProc(renderGameBoard, game);

  /**
   * Get the winner
   */
  const winner = getWinner(game);

  /**
   * Set the ending output text based on the outcome
   */
  const endingText = winner ? `The winner was Player ${winner}` : `No winner!`;

  /**
   * Render the ending output text
   */
  yield putStream(process.stdout, endingText + '\n\n');

  /**
   * Pause the input stream to allow for exit
   */
  yield pauseStream(process.stdin);
}

/**
 * Main process
 */
function* main() {
  yield parallel([
    callProc(gameLoop),
  ]);
}

/**
 * Run the main process
 */
const mainTask = interpreter(main);

/**
 * Handle errors and completion
 */
mainTask.done
.then(() => console.log('program done'))
.catch((error) => console.error('program crashed', error));
