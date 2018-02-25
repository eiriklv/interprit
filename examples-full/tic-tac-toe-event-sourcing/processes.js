/**
 * Import effects
 */
const {
  call,
  delay,
  put,
  putStream,
  takeStream,
} = require('../../lib/effects');

/**
 * Board rendering procedure
 */
const renderGameBoard = module.exports.renderGameBoard = function* renderGameBoard(game) {
  yield putStream(process.stdout, `\n`);
  yield putStream(process.stdout, `${game[0][0] || ' '}|${game[0][1] || ' '}|${game[0][2] || ' '}\n`);
  yield putStream(process.stdout, `-+-+-\n`);
  yield putStream(process.stdout, `${game[1][0] || ' '}|${game[1][1] || ' '}|${game[1][2] || ' '}\n`);
  yield putStream(process.stdout, `-+-+-\n`);
  yield putStream(process.stdout, `${game[2][0] || ' '}|${game[2][1] || ' '}|${game[2][2] || ' '}\n\n`);
}

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
}
