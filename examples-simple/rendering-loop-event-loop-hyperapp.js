'use strict';

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
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
}, io);

/**
 * System command types - actions that trigger sagas
 */
const commandTypes = {
  INCREMENT_COUNTER_COMMAND: 'INCREMENT_COUNTER_COMMAND',
  DECREMENT_COUNTER_COMMAND: 'DECREMENT_COUNTER_COMMAND',
}

/**
 * System event types - actions that trigger state changes
 */
const eventTypes = {
  INCREMENT_COUNTER_EVENT: 'INCREMENT_COUNTER_EVENT',
  DECREMENT_COUNTER_EVENT: 'DECREMENT_COUNTER_EVENT',
}

/**
 * State update logic (just a reducer)
 */
const updateState = (state = initialState, action) => {
  switch (action.type) {
    case eventTypes.INCREMENT_COUNTER_EVENT:
    return Object.assign({}, state, {
      counter: state.counter + 1,
    });

    case eventTypes.DECREMENT_COUNTER_EVENT:
    return Object.assign({}, state, {
      counter: state.counter - 1,
    });

    default:
    return state;
  }
};

/**
 * UI / View application (Hyperapp)
 */
const app = function (state, commands) {
  console.log({ state, commands });
}

/**
 * Saga for incrementing counter
 */
function* incrementCounter() {
  while (true) {
    yield take(commandTypes.INCREMENT_COUNTER_COMMAND);
    yield put({ type: eventTypes.INCREMENT_COUNTER_EVENT });
  }
}

/**
 * Saga for decrementing counter
 */
function* decrementCounter() {
  while (true) {
    yield take(commandTypes.DECREMENT_COUNTER_COMMAND );
    yield put({ type: eventTypes.DECREMENT_COUNTER_EVENT });
  }
}

/**
 * Commands callable as functions (that we pass to the UI)
 * NOTE: Not in use yet (must have vdom renderer ready)
 */
const commands = {
  incrementCounter: () => io.dispatch({ type: commandTypes.INCREMENT_COUNTER_COMMAND }),
  decrementCounter: () => io.dispatch({ type: commandTypes.DECREMENT_COUNTER_COMMAND }),
}

/**
 * Effects loop saga
 * NOTE: This can be used to trigger any effect based on any action
 *
 * NOTE: You could also include state derivation here and make this
 * into a finitie state machine with transition events, where you
 * trigger different side effects based on which state transitions
 * have happened.
 *
 * TODO: Where do you put routing? Routing can be a part of the state
 * and something that triggers an effect of routing when put into the system
 */
function* effectsLoop() {
  while (true) {
    const action = yield take('*');

    switch (action.type) {
      case commandTypes.INCREMENT_COUNTER_COMMAND:
      console.log('side effect from increment command');
      break;

      case commandTypes.DECREMENT_COUNTER_COMMAND:
      console.log('side effect from decrement command');
      break

      default:
      break;
    }
  }
}

/**
 * Render loop saga
 */
function* renderLoop() {
  /**
   * Initial state
   */
  let state = {
    counter: 0,
  };

  /**
   * Listen for actions and update
   * the state accordingly before rendering
   */
  while (true) {
    yield render(app, state, commands);
    const action = yield take('*');
    state = updateState(state, action);
  }
}

/**
 * Main saga
 */
function* main() {
  yield parallel([
    callProc(renderLoop),
    callProc(effectsLoop),
    callProc(decrementCounter),
    callProc(incrementCounter),
  ]);
}

/**
 * Run the main process
 */
interpreter(main);

/**
 * Thoughts:
 *
 * You don't really need redux and middleware anymore
 * when you can just set up sagas that can to all kinds of things to actions.
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
 * Replaced redux with a simple IO implementation
 * that enables you to dispatch and subscribe to the system
 */
