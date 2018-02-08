'use strict';

/**
 * Import dependencies
 */
const fs = require('fs');
const uuid = require('uuid');

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
const { syncChannel, END, isEndOfChannel } = require('../lib/channel');

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
  putSyncChannel,
  takeSyncChannel,
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

function createSyncChannel() {
  return syncChannel();
}

/**
 * Ping process
 */
function* pingProcess({ chan }) {
  while (true) {
    yield putSyncChannel(chan, 'ping');
    yield call(delay, 1000);
    const msg = yield takeSyncChannel(chan);
    console.log(msg);
  }
}

/**
 * Pong process
 */
function* pongProcess({ chan }) {
  while (true) {
    yield call(delay, 5000);
    const msg = yield takeSyncChannel(chan);
    console.log(msg);
    yield putSyncChannel(chan, 'pong');
  }
}

/**
 * Main process
 */
function* mainProcess() {
  const chan = yield call(syncChannel);
  yield fork(pingProcess, { chan });
  yield fork(pongProcess, { chan });
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
   * Create unique filename
   */
  const filename = `../logs/${uuid.v4()}-log.json`;
  const fileStream = fs.createWriteStream(filename, { flags:'a' });

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
    putSyncChannel,
    takeSyncChannel,
  }, io, [], (event) => {
    fileStream.write(`${JSON.stringify(event)}\n`);
  });

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
    .then(() => 'program finished running')
    .catch((error) => console.log('program crashed', error));
  });
}

/**
 * Start the application
 */
application();
