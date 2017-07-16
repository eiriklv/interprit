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
} = require('../provided/effects');

/**
 * Import runtime creator
 */
const createRuntime = require('../lib/runtime');

/**
 * Import IO creator
 */
const { createIO } = require('../provided/io');

/**
 * Create an IO interface to pass to
 * the runtime for handling take/put
 */
const io = createIO();

/**
 * Create a runtime based on the effects resolvers and IO chosen
 */
const runtime = createRuntime([], {
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
 * UI / View application (Something declarative -  DIY React?)
 */
const app = function (props) {
  const { commands, state } = props;
  return state;
}

/**
 * Saga for incrementing counter
 */
function* incrementCounter() {
  while (true) {
    yield take.describe(commandTypes.INCREMENT_COUNTER_COMMAND);
    yield put.describe({ type: eventTypes.INCREMENT_COUNTER_EVENT });
  }
}

/**
 * Saga for decrementing counter
 */
function* decrementCounter() {
  while (true) {
    yield take.describe(commandTypes.DECREMENT_COUNTER_COMMAND );
    yield put.describe({ type: eventTypes.DECREMENT_COUNTER_EVENT });
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
    const action = yield take.describe('*');

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
 * Input / event loop
 * NOTE: This is where you listen to all types of events which
 * can trigger effects in your system (listening to the outside world)
 */
function* eventLoop() {
  /**
   * Listen to external events and then trigger puts when something happens
   */
  while (true) {
    const data = yield takeStream.describe(process.stdin);
    const command = data.toString().trim();

    switch (command) {
      case 'help':
      yield putStream.describe(process.stdout, `> the available commands are \n- increment\n- decrement\n`);
      break;

      case 'increment':
      yield put.describe({ type: commandTypes.INCREMENT_COUNTER_COMMAND });
      break;

      case 'decrement':
      yield put.describe({ type: commandTypes.DECREMENT_COUNTER_COMMAND });
      break;

      default:
      yield putStream.describe(process.stdout, `invalid command input => ${command || 'blank'}\n`);
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
    yield render.describe(app, commands, state);
    const action = yield take.describe('*');
    state = updateState(state, action);
  }
}

/**
 * Main saga
 */
function* main() {
  yield parallel.describe([
    callProc.describe(renderLoop),
    callProc.describe(effectsLoop),
    callProc.describe(eventLoop),
    callProc.describe(decrementCounter),
    callProc.describe(incrementCounter),
  ]);
}

/**
 * Run the main process
 */
runtime(main);

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
