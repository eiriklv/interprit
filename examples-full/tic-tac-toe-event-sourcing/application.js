/**
 * Import interpreter
 */
const { interpreter } = require('./setup');

/**
 * Import effects
 */
const { parallel, callProc } = require('../../lib/effects');

/**
 * Import processes
 */
const {
  inputLoop,
  renderLoop,
  eventLoop,
  commandLoop,
} = require('./loops');

/**
 * Main application process
 */
function* application() {
  yield parallel([
    callProc(inputLoop),
    callProc(renderLoop),
    callProc(eventLoop),
    callProc(commandLoop),
  ]);
}

/**
 * Run the main process using the interpreter
 */
interpreter(application);
