'use strict';

/**
 * Import dependencies
 */
const http = require('http');

/**
 * Effects
 */
const {
  delay,
  apply,
  call,
  fork,
  put,
  take,
  takeChannel,
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
 * Import channel
 */
const { eventChannel } = require('../lib/channel');

/**
 * Create an IO interface to pass to
 * the interpreter for handling take/put
 */
const io = createIO();

/**
 * Create an interpreter based on the effects resolvers and IO chosen
 */
const interpreter = createInterpreter([], {
  delay,
  apply,
  call,
  fork,
  put,
  take,
  takeChannel,
}, io);

/**
 * Function for creating a web-server channel with incoming requests
 */
function createWebServerChannel() {
  return eventChannel((emitter) => {
    const server = http.createServer((req, res) => {
      emitter({ req, res });
    }).listen(3000);

    return () => server.close();
  });
}

/**
 * Request routing process
 */
function* routing({ req, res }) {
  console.log('got request for', req.url);
  yield apply(res, res.writeHead, 200, { 'Content-Type': 'text/plain' });
  yield apply(res, res.end, 'hello');
}

/**
 * Main saga
 */
function* main() {
  const requestChannel = yield call(createWebServerChannel);

  while (true) {
    const incomingRequest = yield takeChannel(requestChannel);
    yield fork(routing, incomingRequest);
  }
}

/**
 * Run the main process
 */
interpreter(main);

/**
 * Thoughts:
 *
 * Do you really need redux and middleware anymore
 * when you can just set up sagas that can to all kinds of things to actions?
 *
 * As long as you have a way of put-ing actions
 * into the system and take-ing actions from the
 * system you can do anything you want.
 *
 * The system also does not really need a getState,
 * as any part that want to maintain some kind of
 * state can just listen for all actions and derive
 * its own state kept locally.
 *
 * TODO (done): Replace redux with a simple IO implementation
 * that enables you to dispatch and subscribe
 */
