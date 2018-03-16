'use strict';

/**
 * Effects
 */
const {
  delay,
  call,
  fork,
  put,
  take,
  self,
  takeChannel,
  actionChannel,
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
 * Create an interpreter based on the effects resolvers and IO chosen
 */
const interpreter = createInterpreter({
  delay,
  call,
  fork,
  put,
  take,
  self,
  takeChannel,
  actionChannel,
}, io);

/**
 * Child process / actor
 */
function* childProcess() {
  const task = yield self();
  const chan = yield actionChannel(task.id);

  while (true) {
    const msg = yield takeChannel(chan);
    yield call(console.log, msg);
  }
}

/**
 * Parent process / actor
 */
function* parentProcess() {
  const childTask = yield fork(childProcess);

  let counter = 0;

  while (true) {
    yield delay(1000);
    yield put({ type: childTask.id, payload: counter++ })
  }
}

/**
 * Run the parent process
 */
interpreter(parentProcess);
