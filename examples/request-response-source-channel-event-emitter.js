'use strict';

/**
 * Import dependencies
 */
const http = require('http');
const { EventEmitter } = require('events');

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
const { requestResponseSourceChannel } = require('../lib/channel');

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
 * Create a socket channel
 */
function createSocketChannel() {
  return requestResponseSourceChannel((register) => {
    /**
     * Create a "socket"
     */
    const emitter = new EventEmitter();

    /**
     * Make the socket react to messages
     */
    emitter.on('message', (msg) => {
      console.log('got reply', msg);
    });

    /**
     * Fake message input
     */
    const interval = setInterval(() => {
      register({ emitter, msg: 'hello' });
    }, 2000);

    /**
     * Return a function to unsubscribe from the source
     */
    return () => {
      clearInterval(interval);
      emitter.removeAllListeners('message');
    }
  }, (request, response) => {
    /**
     * Pull out what we need from the request and response
     */
    const { emitter, msg } = request;
    const [error, reply] = response;

    /**
     * Send something over the socket
     */
    emitter.emit('message', reply);
  });
}

/**
 * Response process
 */
function* responseProcess({ chan }) {
  while (true) {
    const request = yield takeChannelRequest(chan);
    const { id, body } = request;
    const { msg } = body;
    console.log('got request', msg);
    yield putChannelResponse(chan, id, [null, msg.split('').reverse().join('')]);
  }
}

/**
 * Main saga
 */
function* main() {
  const chan = yield call(createSocketChannel);
  const responseTask = yield fork(responseProcess, { chan });
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
