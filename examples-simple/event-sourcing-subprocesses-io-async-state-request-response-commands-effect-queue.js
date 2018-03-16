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
  putChannel,
  spawn,
  select,
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
const { createIO, createIOWithAsyncState } = require('../lib/io');

/**
 * Import channel
 */
const { channel, requestResponseChannel } = require('../lib/channel');

/**
 * Import buffer
 */
const { sliding } = require('../lib/buffer');

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
const getCounter = (state) => Promise.resolve(state.counter);

/**
 * State update logic (just a reducer)
 */
const updateState = (state = initialState, event = {}) => {
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
 * Create an IO interface to pass to
 * the interpreter for handling take/put
 */
const io = createIOWithAsyncState(updateState);

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
  putChannel,
  spawn,
  select,
  putChannelRequest,
  takeChannelRequest,
  putChannelResponse,
  takeChannelResponse,
}, io);

/**
 * Event handlers
 *
 * NOTE: The event handlers generate and trigger
 * effects based on the event and the current state
 */
const eventHandlers = {
  *[eventTypes.INCREMENT_COUNTER_EVENT]({ commandChannel }, event, currentState, previousState) {
    /**
     * Get applicable state from the aggregate
     */
    const counter = yield call(getCounter, previousState);

    /**
     * Generate effects
     * NOTE: Use selectors to query state / models
     */
    const effects = counter === 0 ? [
      call(console.log, 'went positive!'),
      spawn(subProcessType1, { commandChannel, initialValue: counter }),
    ] : [
      call(console.log, 'incremented counter!'),
    ];

    /**
     * Perform effects (in series)
     */
    return [null, effects];
  },
  *[eventTypes.DECREMENT_COUNTER_EVENT]({ commandChannel }, event, currentState, previousState) {
    /**
     * Get applicable state from the aggregate
     */
    const counter = yield call(getCounter, previousState);

    /**
     * Generate effects
     * NOTE: Use selectors to query state / models
     */
    const effects = counter === 0 ? [
      call(console.log, 'went negative!'),
      spawn(subProcessType2, { commandChannel, initialValue: counter }),
    ] : [
      call(console.log, 'decremented counter!'),
    ];

    /**
     * Perform effects (in parallel)
     */
    return [null, effects];
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
  *[commandTypes.INCREMENT_COUNTER_COMMAND](command) {
    /**
     * Get the state of the system (aggregate)
     */
    const counter = yield select(getCounter);

    /**
     * NOTE: Check invariants and rules against state
     * NOTE: Use selectors on the state / models
     */
    if (counter >= 7) {
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
  *[commandTypes.DECREMENT_COUNTER_COMMAND](command) {
    /**
     * Get the state of the system (aggregate)
     */
    const counter = yield select(getCounter);

    /**
     * NOTE: Check invariants and rules against state
     * NOTE: Use selectors on the state / models
     */
    if (counter <= -7) {
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
function* subProcessType1({ initialValue, commandChannel }) {
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
  yield putRequest(commandChannel, commandCreators.incrementCounter());
  const [error, result] = yield takeChannelResponse(commandChannel, requestId);
}

/**
 * Subprocess type 2
 */
function* subProcessType2({ initialValue, commandChannel }) {
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
  yield putRequest(commandChannel, commandCreators.decrementCounter());
  const [error, result] = yield takeChannelResponse(commandChannel, requestId);
}

/**
 * Input loop
 *
 * NOTE: This is where you listen to all types of events which
 * can trigger effects in your system (listening to the outside world)
 */
function* inputLoop({ commandChannel }) {
  /**
   * Listen to external events and then trigger puts when something happens
   */
  while (true) {
    const data = yield takeStream(process.stdin);
    const command = data.toString().trim();
    let requestId, error, result;

    switch (command) {
      case 'help':
      yield putStream(process.stdout, `> the available commands are \n- increment\n- decrement\n`);
      break;

      case 'increment':
      requestId = yield putChannelRequest(commandChannel, commandCreators.incrementCounter());
      [error, result] = yield takeChannelResponse(commandChannel, requestId);
      yield call(console.log, error ? `Command failed with reason ${error.message}` : `Command succeeded`);
      break;

      case 'decrement':
      requestId = yield putChannelRequest(commandChannel, commandCreators.decrementCounter());
      [error, result] = yield takeChannelResponse(commandChannel, requestId);
      yield call(console.log, error ? `Command failed with reason ${error.message}` : `Command succeeded`);
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
   * Create a channel to queue up all incoming events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Listen for events and render the current state
   */
  while (true) {
    /**
     * Get the current state
     */
    const state = yield select();

    /**
     * Render the app
     */
    yield render(app, state, commands);

    /**
     * Wait for the next event
     */
    const event = yield takeChannel(eventChannel);
  }
}

/**
 * Effect loop
 */
function* effectLoop({ effectQueue }) {
  /**
   * Process events and trigger effects
   */
  while (true) {
    /**
     * Take the next event from the channel / queue
     */
    const effect = yield takeChannel(effectQueue);

    /**
     * Trigger the effect
     */
    yield effect;
  }
}

/**
 * Event loop
 */
function* eventLoop({ commandChannel, effectQueue }) {
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
     *
     * TODO: Must replace the supplied state here with a possibility to query
     * some root aggregate at a specific event id (so we can get the value of the aggregate for any event)
     *
     * TODO: Should the event loop keep its own internal state to query so that we can
     * apply events to the internal state to keep it updated, and the use snapshots?
     */
    const [event, currentState, previousState] = yield takeChannel(eventChannel);

    /**
     * Get the appropriate event handler
     */
    const handleEvent = getEventHandlerByType(event.type);

    /**
     * Handle the event and trigger the appropriate effects
     */
    const [error, effects] = yield callProc(handleEvent, { commandChannel }, event, currentState, previousState);

    /**
     * Put the effects on the effects queue
     */
    for (let effect of effects) {
      yield putChannel(effectQueue, effect);
    }
  }
}

/**
 * Command loop
 */
function* commandLoop({ commandChannel }) {
  /**
   * Listen for command and handle them sequentially
   */
  while (true) {
    /**
     * Wait for the next command request
     */
    const request = yield takeChannelRequest(commandChannel);
    const { id: requestId, body: command } = request;

    /**
     * Get the appropriate command handler
     */
    const handleCommand = getCommandHandlerByType(command.type);

    /**
     * Handle the command and capture the generated events
     */
    const [error, events = []] = yield callProc(handleCommand, command);

    /**
     * If the command could not be processed, respond with an error
     */
    if (error) {
      yield putChannelResponse(commandChannel, requestId, [error]);
      continue;
    }

    /**
     * Commit the events / put the events into the system for other remote consumers
     */
    for (let event of events) {
      yield put(event);
    }

    /**
     * Respond to the command request
     */
    yield putChannelResponse(commandChannel, requestId, [null, { command, events }]);
  }
}

/**
 * Main process
 */
function* main() {
  /**
   * Create a request / response channel for processing incoming commands
   */
  const commandChannel = yield call(requestResponseChannel);

  /**
   * Create channels to serve as queues
   */
  const effectQueue = yield call(channel, sliding(Infinity));

  /**
   * Run all the essential processes
   */
  yield parallel([
    callProc(inputLoop, { commandChannel }),
    callProc(commandLoop, { commandChannel }),
    callProc(eventLoop, { commandChannel, effectQueue }),
    callProc(effectLoop, { effectQueue }),
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
