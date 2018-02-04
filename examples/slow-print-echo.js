'use strict';

/**
 * Redux
 */
const {
  createStore,
  applyMiddleware,
} = require('../lib/redux');

/**
 * Redux middleware
 */
const {
  addDispatchSubscriptionToStore,
  addLoggingToStore,
} = require('../lib/middleware');

/**
 * Effects
 */
const {
  call,
  callProc,
  cps,
  race,
  fork,
  parallel,
  putAction,
  takeAction,
  putStream,
  takeStream,
  putEvent,
  takeEvent,
} = require('../lib/effects');

/**
 * Utils
 */
const {
  delay,
} = require('../lib/utils');

/**
 * Interpreter
 */
const createInterpreter = require('../lib/interpreter');

/**
 * Middleware to add logging of effects
 */
function logMiddleware(effect) {
  console.log(effect.type);
  return effect;
}

/**
 * A sub-process that writes a string to
 * stdout one character at the time with an interval
 */
function* slowPrint(str, interval) {
  const chars = str.split('');
  let char;

  while (char = chars.shift()) {
    yield putStream(process.stdout, char);
    yield call(delay, interval);
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* slowEchoProcess() {
  while (true) {
    const data = yield takeStream(process.stdin);
    /**
     * TODO: Make an example which uses 'callProc'
     * instead of yield*
     */
    yield* slowPrint(data.toString(), 50);
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* slowPrintEcho() {
  while (true) {
    const data = yield takeStream(process.stdin);
    const chars = data.toString().split('');
    let currentChar;

    while (currentChar = chars.shift()) {
      yield putStream(process.stdout, currentChar);
      yield call(delay, 50);
    }
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* slowEchoForkProcess() {
  yield fork(slowEchoProcess);
  yield fork(slowEchoProcess);
}

/**
 * Create a handler that will handle
 * the built up context of each program that is run
 */
function finalHandler(err, value) {
  console.log(this);
}

/**
 * Create a state reducer function
 */
function reducer(state = {}, action) {
  switch (action.type) {
    case 'SOME_ACTION':
      return state;
    default:
      return state;
  }
}

/**
 * Run the program using our interpreter
 */
function application () {
  /**
   * Create instance of takeActionsMiddleware
   */
  const subscribeToDispatchMiddleware = addDispatchSubscriptionToStore({});

  /**
   * Create instance of logger middleware
   */
  const loggerMiddleware = addLoggingToStore({});

  /**
   * Application state handler
   */
  const store = createStore(
    reducer,
    applyMiddleware(
      subscribeToDispatchMiddleware,
      loggerMiddleware
    )
  );

  /**
   * Create subscriber for state changes
   */
  store.subscribe(() => {
    console.log('state changed!', store.getState());
  });

  /**
   * Create the IO interface to pass to
   * the interpreter for handling takeAction/putAction/select
   */
  const io = {
    dispatch: store.dispatch,
    subscribe: subscribeToDispatchMiddleware.subscribe,
    getState: store.getState,
  }

  /**
   * Create an interpreter
   */
  const interpreter = createInterpreter([logMiddleware], {
    call,
    callProc,
    cps,
    race,
    fork,
    parallel,
    putAction,
    takeAction,
    putStream,
    takeStream,
    putEvent,
    takeEvent,
  }, io);

  /**
   * Gather all the processes
   */
  const processes = [
    // slowEchoProcess,
    // slowPrintEcho,
    slowEchoForkProcess,
  ];

  /**
   * Dependencies / arguments for the processes
   */
  const args = {};

  /**
   * Create a global context
   */
  const context = {};

  /**
   * Run all the processes
   */
  processes.forEach((proc) => {
    interpreter(proc, context, finalHandler, args);
  });
}

/**
 * Start the application
 */
application();
