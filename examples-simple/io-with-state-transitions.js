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
} = require('../lib/effects');

/**
 * Import interpreter creator
 */
const createInterpreter = require('../lib/interpreter');

/**
 * Import IO creator
 */
const { createIOWithStateTransitions } = require('../lib/io');

/**
 * Import channel
 */
const { requestResponseSourceChannel } = require('../lib/channel');

/**
 * Reducer function to update state
 */
function updateState(state = { counter: 1 }, action = {}) {
  switch (action.type) {
    case 'INCREMENT':
    return {
      ...state,
      counter: state.counter + 1,
    };

    case 'DECREMENT':
    return {
      ...state,
      counter: state.counter - 1,
    }

    default:
    return state;
  }
}

/**
 * Create an IO interface to pass to
 * the interpreter for handling take/put
 */
const io = createIOWithStateTransitions(updateState);

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
}, io);

/**
 * Response process
 */
function* responseProcess() {
  while (true) {
    const input = yield take('*');
    console.log(input);
  }
}

/**
 * Main saga
 */
function* main() {
  const responseTask = yield fork(responseProcess);

  while (true) {
    yield delay(1000);
    yield put({ type: 'INCREMENT' });
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
