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
 * Command creators
 */
const commandCreators = {
  incrementCounter: () => ({ type: commandTypes.INCREMENT_COUNTER_COMMAND }),
  decrementCounter: () => ({ type: commandTypes.DECREMENT_COUNTER_COMMAND }),
}

/**
 * Event creators
 */
const eventCreators = {
  incrementCounter: () => ({ type: eventTypes.INCREMENT_COUNTER_EVENT }),
  decrementCounter: () => ({ type: eventTypes.DECREMENT_COUNTER_EVENT }),
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
function* calculateEffects(event, state) {
  switch (event.type) {
    case eventTypes.INCREMENT_COUNTER_EVENT:
    return [
      call([console, console.log], 'side effect from increment command')
    ];

    case eventTypes.DECREMENT_COUNTER_EVENT:
    return [
      call([console, console.log], 'side effect from increment command')
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
    return [eventCreators.incrementCounter()];
  },
  *[commandTypes.DECREMENT_COUNTER_COMMAND](command, state) {
    return [eventCreators.decrementCounter()];
  },
  *default({ type }) {
    yield call([console, console.log], `Unrecognized command of type ${type} supplied - Did you forget to add it to the handler map?`);
    return [];
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
  console.log({ state, commands });
}

/**
 * Main loop
 */
function* main() {
  /**
   * Initial state
   */
  let state = {
    counter: 0,
  };

  /**
   * State log
   */
  let stateLog = [state];

  /**
   * Command history
   */
  let commandLog = [];

  /**
   * Event history
   */
  let eventLog = [];

  /**
   * Effect history
   */
  let effectLog = [];

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
    const command = yield take('*');

    /**
     * Store the command
     */
    commandLog.push(command);

    /**
     * Get the appropriate command handler
     */
    const handleCommand = getCommandHandlerByType(command.type);

    /**
     * Handle the command and capture the generated events
     */
    const events = yield callProc(handleCommand, command, state);

    /**
     * Store the events
     */
    eventLog.push(...events);

    /**
     * Calculate the resulting effects from the event and current state
     */
    let effects = [];
    for (let event of events) {
      let resultingEffects = yield callProc(calculateEffects, event, state);
      effects = [...effects, resultingEffects];
    }

    /**
     * Store the effects
     */
    effectLog.push(...effects);

    /**
     * Update the state based on the event
     */
    state = updateState(state, event);

    /**
     * Store the state
     */
    stateLog.push(state);

    /**
     * Perform the resulting effects
     */
    for (let effect of effects) {
      yield effect;
    }
  }
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
