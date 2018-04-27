'use strict';

/**
 * Dependencies
 */
const uuid = require('uuid');

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
  send,
  receive,
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
  send,
  receive,
  takeChannel,
  actionChannel,
}, io);

/**
 * Child process / actor
 */
function* childProcess() {
  while (true) {
    const [msg, provider] = yield receive();
    yield call(console.log, 'got message', msg, 'from', provider.id);
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
    yield send(childTask, { type: 'SOME_MESSAGE_TYPE', payload: counter++ });
  }
}

/**
 * Run the parent process
 */
interpreter(parentProcess);
