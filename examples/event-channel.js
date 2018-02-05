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
const { eventChannel, END, isEndOfChannel } = require('../lib/channel');

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

function createTimerChannel(secs) {
  return eventChannel(emitter => {
    const iv = setInterval(() => {
      secs -= 1;
      if (secs > 0) {
        emitter(secs);
      } else {
        // this causes the channel to close
        emitter(END);
      }
    }, 1000);
    // The subscriber must return an unsubscribe function
    return () => {
      clearInterval(iv);
    };
  });
}

/**
 * Main process
 */
function* mainProcess() {
  const timerChannel = yield call(createTimerChannel, 10);

  while (true) {
    const result = yield takeChannel(timerChannel);

    if (!isEndOfChannel(result)) {
      console.log('got from channel:', result);
    } else {
      console.log('channel ended');
      break;
    }
  }

  console.log('program done');
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
    .then(() => 'program finished running')
    .catch((error) => console.log('program crashed', error));
  });
}

/**
 * Start the application
 */
application();
