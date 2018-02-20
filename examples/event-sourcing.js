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
 * State update logic (just a reducer)
 */
const updateState = (state = initialState, event) => {
  switch (event.type) {
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
 * Effect calculation logic
 */
function calculateEffects(event, state) {
  switch (event.type) {
    case eventTypes.INCREMENT_COUNTER_EVENT:
    return [
      call(console.log, 'side effect from increment command'),
    ];

    case eventTypes.DECREMENT_COUNTER_EVENT:
    return [
      call(console.log, 'side effect from decrement command'),
    ];

    default:
    return [];
  }
}

/**
 * Command handlers
 *
 * NOTE: The command handlers return events generated from the command
 * based on the command and the current state
 */
const commandHandlers = {
  *[commandTypes.INCREMENT_COUNTER_COMMAND](command, state) {
    /**
     * TODO: Check invariants and rules against state
     */

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
     */

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
      yield put({ type: commandTypes.INCREMENT_COUNTER_COMMAND });
      break;

      case 'decrement':
      yield put({ type: commandTypes.DECREMENT_COUNTER_COMMAND });
      break;

      default:
      yield putStream(process.stdout, `invalid command input => ${command || 'blank'}\n`);
      break;
    }
  }
}

/**
 * Event loop
 */
function* eventLoop() {
  /**
   * Initial state
   */
  let state = { counter: 0 };

  /**
   * Logs
   */
  let commandLog = [];
  let eventLog = [];
  let effectLog = [];

  /**
   * Create an action channel
   */
  const commandChannel = yield actionChannel('*');

  /**
   * Listen for actions and update
   * the state accordingly before rendering
   */
  while (true) {
    /**
     * Render the app
     */
    yield render(app, state, commands);

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
    const [error, events] = yield callProc(handleCommand, command, state);

    /**
     * Store the command and references to the generated events
     */
    commandLog.push({
      ...command,
      state: error ? 'rejected' : 'fulfilled',
      children: error ? [] : events.map(({ id }) => id),
    });

    /**
     * If the command could not be processed
     */
    if (error) {
      yield call(console.log, `Command ${command.type} failed with reason: ${error.message}`);
      continue;
    }

    /**
     * Store / commit the events
     *
     * NOTE: This is where you would store event in a persistent database or push it to a queue
     */
    eventLog.push(...events.map((event) => ({
      ...event,
      parent: command.id,
    })));

    /**
     * Calculate the resulting effects from the event and current state
     */
    for (let event of events) {
      /**
       * Calculate effects for event
       */
      let effects = calculateEffects(event, state);

      /**
       * Store / commit the effects
       * NOTE: This is where you would push effects into a queue for execution
       */
      effectLog.push(...effects.map((effect) => ({
        ...effect,
        parent: event.id,
      })));

      /**
       * Perform the resulting effects
       */
      for (let effect of effects) {
        yield effect;
      }
    }

    /**
     * Update the state based on the event
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
    callProc(eventLoop),
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
