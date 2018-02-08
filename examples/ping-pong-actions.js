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
  parallel,
  put,
  take,
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
 * A process we want to run
 * that communicates with another
 * process by putting actions into
 * the event loop and listening for actions
 */
function* processOne() {
  while (true) {
    yield take('PING');
    yield call(delay, 2000);
    yield put({ type: 'PONG' });
  }
}

/**
 * A process we want to run
 * that communicates with another
 * process by putting actions into
 * the event loop and listening for actions
 */
function* processTwo() {
  while (true) {
    yield put({ type: 'PING' });
    yield take('PONG');
    yield call(delay, 2000);
  }
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
    callProc,
    cps,
    race,
    parallel,
    put,
    take,
    putStream,
    takeStream,
    putEvent,
    takeEvent,
  }, io);

  /**
   * Gather all the processes
   */
  const processes = [
    processOne,
    processTwo,
  ];

  /**
   * Dependencies / arguments for each process
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
