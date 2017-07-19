'use strict';

/**
 * Redux
 */
const {
  createStore,
  applyMiddleware,
} = require('../provided/redux');

/**
 * Redux middleware
 */
const {
  addDispatchSubscriptionToStore,
  addLoggingToStore,
} = require('../provided/middleware');

/**
 * Effects
 */
const {
  call,
  callProc,
  cps,
  race,
  parallel,
  putAction,
  takeAction,
  putStream,
  takeStream,
  putEvent,
  takeEvent,
} = require('../provided/effects');

/**
 * Runtime
 */
const createRuntime = require('../lib/runtime');

/**
 * Middleware to add logging of effects
 */
function logMiddleware(effect) {
  console.log(effect.type);
  return effect;
}

/**
 * A process that listens for
 * events on a stream and outputs
 * events to another stream
 */
function* streamProcess() {
  while (true) {
    const data = yield takeStream.describe(process.stdin);
    yield putStream.describe(process.stdout, `message received: ${data}`);
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
 * Run the program using our runtime
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
   * the runtime for handling takeAction/putAction/select
   */
  const io = {
    dispatch: store.dispatch,
    subscribe: subscribeToDispatchMiddleware.subscribe,
    getState: store.getState,
  }

  /**
   * Create a runtime
   */
  const runtime = createRuntime([logMiddleware], {
    call,
    callProc,
    cps,
    race,
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
    streamProcess,
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
    runtime(proc, context, finalHandler, args);
  });
}

/**
 * Start the application
 */
application();
