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
 * Event emitter
 */
const { EventEmitter } = require('events');

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
 * another process over a socket / emitter
 * via events
 */
function* socketProcessOne({ socket }) {
  while (true) {
    yield call.describe(delay, 2000);
    yield putEvent.describe(socket, 'my_event', 'ping!');
    const data = yield takeEvent.describe(socket, 'my_event');
    yield putStream.describe(process.stdout, `(1) event received: ${data}\n`);
  }
}

/**
 * A process that communicates with
 * another process over a socket / emitter
 * via events
 */
function* socketProcessTwo({ socket }) {
  while (true) {
    const data = yield takeEvent.describe(socket, 'my_event');
    yield putStream.describe(process.stdout, `(2) event received: ${data}\n`);
    yield call.describe(delay, 2000);
    yield putEvent.describe(socket, 'my_event', 'pong!');
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
   * Create a global socket / emitter
   */
  const socket = new EventEmitter();

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
    socketProcessOne,
    socketProcessTwo,
  ];

  /**
   * Dependencies / arguments to the processes
   */
  const args = {
    socket,
  };

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
