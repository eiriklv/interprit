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
  putChannelRequest,
  takeChannelRequest,
  putChannelResponse,
  takeChannelResponse,
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
const { requestResponseChannel } = require('../lib/channel');

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
  apply,
  call,
  fork,
  put,
  take,
  putChannelRequest,
  takeChannelRequest,
  putChannelResponse,
  takeChannelResponse,
}, io);

/**
 * Request process
 */
function* requestProcess({ chan }) {
  while (true) {
    const msg = { type: 'MESSAGE', payload: {} };
    const id = yield putChannelRequest(chan, msg);
    yield delay(1000);
    const response = yield takeChannelResponse(chan, id);
    console.log('got response', response);
  }
}

/**
 * Response process
 */
function* responseProcess({ chan }) {
  while (true) {
    const request = yield takeChannelRequest(chan);
    const { id, body } = request;
    console.log('got request', request);
    yield delay(2000);
    yield putChannelResponse(chan, id, [null, 'hello']);
  }
}

/**
 * Main saga
 */
function* main() {
  const chan = yield call(requestResponseChannel);
  const responseTask = yield fork(responseProcess, { chan });
  const requestTask = yield fork(requestProcess, { chan });
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
