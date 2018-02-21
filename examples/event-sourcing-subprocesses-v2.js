'use strict';

/**
 * Depedencies
 */
const uuid = require('uuid');

/**
 * Effects
 */
const {
  call,
  delay,
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
  actionChannel,
  takeChannel,
  spawn,
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
  call,
  delay,
  render,
  callProc,
  parallel,
  put,
  take,
  takeStream,
  putStream,
  actionChannel,
  takeChannel,
  spawn,
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
 * Command creators
 */
const commandCreators = {
  incrementCounter: () => ({ id: uuid.v4(), type: commandTypes.INCREMENT_COUNTER_COMMAND }),
  decrementCounter: () => ({ id: uuid.v4(), type: commandTypes.DECREMENT_COUNTER_COMMAND }),
}

/**
 * Event creators
 */
const eventCreators = {
  incrementCounter: () => ({ id: uuid.v4(), type: eventTypes.INCREMENT_COUNTER_EVENT }),
  decrementCounter: () => ({ id: uuid.v4(), type: eventTypes.DECREMENT_COUNTER_EVENT }),
}

/**
 * Commands callable as functions (that we pass to the UI)
 * NOTE: Not in use yet (must have vdom renderer ready)
 */
const commands = {
  incrementCounter: () => io.dispatch(commandCreators.incrementCounter()),
  decrementCounter: () => io.dispatch(commandCreators.decrementCounter()),
}

/**
 * Initial state representation
 */
const initialState = { counter: 0 };

/**
 * Selectors
 */
const getCounter = (state) => state.counter;

/**
 * State update logic (just a reducer)
 */
const updateState = (state = initialState, event) => {
  switch (event.type) {
    case eventTypes.INCREMENT_COUNTER_EVENT:
    return {
      ...state,
      counter: state.counter + 1,
    };

    case eventTypes.DECREMENT_COUNTER_EVENT:
    return {
      ...state,
      counter: state.counter - 1,
    };

    default:
    return state;
  }
};

/**
 * Event handlers
 *
 * NOTE: The event handlers generate and trigger
 * effects based on the event and the current state
 */
const eventHandlers = {
  *[eventTypes.INCREMENT_COUNTER_EVENT](event, state) {
    /**
     * Generate effects
     */
    const effects = state.counter === 0 ? [
      call(console.log, 'went positive!'),
      spawn(subProcessType1, getCounter(state)),
    ] : [
      call(console.log, 'incremented counter!'),
    ];

    /**
     * Perform effects (in series)
     */
    for (let effect of effects) {
      yield effect;
    }
  },
  *[eventTypes.DECREMENT_COUNTER_EVENT](event, state) {
    /**
     * Generate effects
     * TODO: Use selectors to query state / models
     */
    const effects = state.counter === 0 ? [
      call(console.log, 'went negative!'),
      spawn(subProcessType2, getCounter(state)),
    ] : [
      call(console.log, 'decremented counter!'),
    ];

    /**
     * Perform effects (in parallel)
     */
    yield parallel(effects);
  },
  *default({ type }) {
    /**
     * Do nothing if the event has no handler
     */
  },
};

/**
 * Event handler resolver
 */
function getEventHandlerByType(type) {
  return eventHandlers[type] || eventHandlers.default;
}

/**
 * Command handlers
 *
 * NOTE: The command handlers return events generated from
 * the command and the current state or aborts if it fails any invariants
 */
const commandHandlers = {
  *[commandTypes.INCREMENT_COUNTER_COMMAND](command, state) {
    /**
     * TODO: Check invariants and rules against state
     * TODO: Use selectors on the state / models
     */
    if (getCounter(state) >= 7) {
      return [new Error('Cannot increment to more than 7')];
    }

    /**
     * Create resulting events
     */
    const events = [eventCreators.incrementCounter()];

    /**
     * Return resulting event(s)
     */
    return [null, events];
  },
  *[commandTypes.DECREMENT_COUNTER_COMMAND](command, state) {
    /**
     * TODO: Check invariants and rules against state
     * TODO: Use selectors on the state / models
     */
    if (getCounter(state) <= -7) {
      return [new Error('Cannot decrement to more than -7')];
    }

    /**
     * Create resulting events
     */
    const events = [eventCreators.decrementCounter()];

    /**
     * Return resulting event(s)
     */
    return [null, events];
  },
  *default({ type }) {
    /**
     * Abort / throw error if the command has no handler
     */
    return [new Error(`Unrecognized command of type ${type} supplied - Did you forget to add it to the handler map?`)];
  },
};

/**
 * Command handler resolver
 */
function getCommandHandlerByType(type) {
  return commandHandlers[type] || commandHandlers.default;
}

/**
 * UI / View application (Hyperapp)
 */
const app = function (state, commands) {
  return { state, commands };
}

/**
 * Subprocess type 1
 */
function* subProcessType1(initialValue) {
  /**
   * Initialize the subprocess
   */
  let increments = initialValue;

  /**
   * Do some fancy logic (short or long running)
   */
  while (increments < 5) {
    yield call(console.log, 'woopwoop');
    yield take('INCREMENT_COUNTER_EVENT');
    increments++;
  }

  yield call(console.log, 'subprocess type 1 done');

  /**
   * Trigger a command
   */
  yield put(commandCreators.incrementCounter());
}

/**
 * Subprocess type 2
 */
function* subProcessType2(initialValue) {
  /**
   * Initialize the subprocess
   */
  let increments = initialValue;

  /**
   * Do some fancy logic (short or long running)
   */
  while (increments < 5) {
    yield call(console.log, 'woopywoopy');
    yield delay(1000);
    increments++;
  }

  yield call(console.log, 'subprocess type 2 done');

  /**
   * Trigger a command
   */
  yield put(commandCreators.decrementCounter());
}

/**
 * Input loop
 *
 * NOTE: This is where you listen to all types of events which
 * can trigger effects in your system (listening to the outside world)
 */
function* inputLoop() {
  /**
   * Listen to external events and then trigger puts when something happens
   */
  while (true) {
    const data = yield takeStream(process.stdin);
    const command = data.toString().trim();

    switch (command) {
      case 'help':
      yield putStream(process.stdout, `> the available commands are \n- increment\n- decrement\n`);
      break;

      case 'increment':
      yield put(commandCreators.incrementCounter());
      break;

      case 'decrement':
      yield put(commandCreators.decrementCounter());
      break;

      default:
      yield putStream(process.stdout, `invalid command input => ${command || 'blank'}\n`);
      break;
    }
  }
}

/**
 * Render loop
 */
function* renderLoop() {
  /**
   * Initial state
   */
  let state = initialState;

  /**
   * Create a channel to queue up all incoming events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Listen for events and render the current state
   */
  while (true) {
    /**
     * Render the app
     */
    yield render(app, state, commands);

    /**
     * Wait for the next event
     */
    const event = yield takeChannel(eventChannel);

    /**
     * Update the local state based on the event
     */
    state = updateState(state, event);
  }
}

/**
 * Event loop
 */
function* eventLoop() {
  /**
   * Initialize the local stat representation
   */
  let state = initialState;

  /**
   * Create a channel for listening for events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Process events and trigger effects
   */
  while (true) {
    /**
     * Take the next event from the channel / queue
     */
    const event = yield takeChannel(eventChannel);

    /**
     * Get the appropriate event handler
     */
    const handleEvent = getEventHandlerByType(event.type);

    /**
     * Handle the event and trigger the appropriate effects
     */
    yield callProc(handleEvent, event, state);

    /**
     * Update the local state based on the event
     */
    state = updateState(state, event);
  }
}

/**
 * Command lopp
 */
function* commandLoop() {
  /**
   * Initial state
   */
  let state = initialState;

  /**
   * Create a channel to queue up all incoming commands
   */
  const commandChannel = yield actionChannel('*_COMMAND');

  /**
   * Listen for command and handle them sequentially
   */
  while (true) {
    /**
     * Wait for the next command
     */
    const command = yield takeChannel(commandChannel);

    /**
     * Get the appropriate command handler
     */
    const handleCommand = getCommandHandlerByType(command.type);

    /**
     * Handle the command and capture the generated events
     */
    const [error, events = []] = yield callProc(handleCommand, command, state);

    /**
     * If the command could not be processed
     */
    if (error) {
      yield call(console.log, `Command ${command.type} failed with reason: ${error.message}`);
      continue;
    }

    /**
     * Put the events into the system for other remote consumers
     */
    for (let event of events) {
      yield put(event);
    }

    /**
     * Update the state based on the event(s)
     */
    for (let event of events) {
      state = updateState(state, event);
    }
  }
}

/**
 * Main process
 */
function* main() {
  yield parallel([
    callProc(inputLoop),
    callProc(commandLoop),
    callProc(eventLoop),
    callProc(renderLoop),
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
