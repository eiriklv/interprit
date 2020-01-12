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
 * Channel interface
 */
const { channel: createChannel } = require('../lib/channel');

/**
 * Effects
 */
const {
  call,
  fork,
  join,
  cancel,
  cancelled,
  putStream,
  takeStream,
  putChannel,
  takeChannel,
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
  if (typeof effect === 'object') {
    console.log(effect.type);
  } else {
    console.log('@value', effect);
  }
  return effect;
}

/**
 * A process that communicates with
 * another process over a channel
 */
function* subProcess1() {
  const a = yield 100;
  const b = yield 500;
  yield call(delay, 5000);
  return a + b;
}

/**
 * A process that communicates with
 * another process over a channel
 */
function* subProcess2() {
  return 1000;
}

/**
 * Main process
 */
function* mainProcess() {
  const task1 = yield fork(subProcess1);
  const result1 = yield join(task1);

  const task2 = yield fork(subProcess2);
  const result2 = yield join(task2);

  console.log(result1, result2);
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
   * Create instance of takesMiddleware
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
   * the interpreter for handling take/put/select
   */
  const io = {
    dispatch: store.dispatch,
    subscribe: subscribeToDispatchMiddleware.subscribe,
    getState: store.getState,
  }

  /**
   * Create an interpreter
   */
  const interpreter = createInterpreter({
    call,
    fork,
    join,
    cancel,
    cancelled,
    putStream,
    takeStream,
    putChannel,
    takeChannel,
  }, io);

  /**
   * Gather all the processes
   */
  const processes = [
    mainProcess,
  ];

  /**
   * Dependencies / arguments to the processes
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
    interpreter(proc, context, finalHandler, args).done
    .then(() => console.log('program finished running'))
    .catch((error) => console.log('program crashed', error));
  });
}

/**
 * Start the application
 */
application();
