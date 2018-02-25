/**
 * Import effects
 */
const { call, delay, put } = require('../../lib/effects');

/**
 * Import command utilities
 */
const { commandCreators } = require('./actions');

/**
 * Subprocess for celebrating winner
 */
const celebrateWinner = module.exports.celebrateWinner = function* celebrateWinner() {
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
