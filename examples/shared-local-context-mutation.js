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
  setLocalContext,
  getLocalContext,
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
 * Middleware to add logging of effects
 */
function logMiddleware(effect) {
  console.log(effect.type);
  return effect;
}

/**
 * A process that communicates with
 * another process over a channel
 */
function* subProcess1({ channel }) {
  while (true) {
    yield call(delay, 2000);
    yield putChannel(channel, 'ping!');
    const data = yield takeChannel(channel);
    const context = yield getLocalContext();
    yield putStream(process.stdout, `(1) event received: ${JSON.stringify(context, null, 2)}\n`);
    yield setLocalContext({ scooby: false });
  }
}

/**
 * A process that communicates with
 * another process over a channel
 */
function* subProcess2({ channel }) {
  while (true) {
    const data = yield takeChannel(channel);
    const context = yield getLocalContext();
    yield putStream(process.stdout, `(2) event received: ${JSON.stringify(context, null, 2)}\n`);
    yield setLocalContext({ scooby: true });
    yield call(delay, 2000);
    yield putChannel(channel, 'pong!');
  }
}

/**
 * Main process
 */
function* mainProcess() {
  const channel = yield call(createChannel);
  yield fork(subProcess1, { channel });
  yield fork(subProcess2, { channel });
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
    setLocalContext,
    getLocalContext,
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
