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
 * Channel interface
 */
const { channel: createChannel } = require('../provided/channel');

/**
 * Effects
 */
const {
  call,
  fork,
  putStream,
  takeStream,
  putChannel,
  takeChannel,
} = require('../provided/effects');

/**
 * Utils
 */
const {
  delay,
} = require('../utils');

/**
 * Runtime
 */
const createRuntime = require('../lib/runtime');

/**
 * Middleware to add logging of the context
 */
function* logMiddleware() {
  console.log(this);
}

/**
 * A process that communicates with
 * another process over a channel
 */
function* subProcess1({ channel }) {
  while (true) {
    yield call.describe(delay, 2000);
    yield putChannel.describe(channel, 'ping!');
    const data = yield takeChannel.describe(channel);
    yield putStream.describe(process.stdout, `(1) event received: ${data}\n`);
  }
}

/**
 * A process that communicates with
 * another process over a channel
 */
function* subProcess2({ channel }) {
  while (true) {
    const data = yield takeChannel.describe(channel);
    yield putStream.describe(process.stdout, `(2) event received: ${data}\n`);
    yield call.describe(delay, 2000);
    yield putChannel.describe(channel, 'pong!');
  }
}

/**
 * Main process
 */
function* mainProcess() {
  const channel = yield call.describe(createChannel);
  yield fork.describe(subProcess1, { channel });
  yield fork.describe(subProcess2, { channel });
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
    fork,
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
    runtime(proc, context, finalHandler, args);
  });
}

/**
 * Start the application
 */
application();
