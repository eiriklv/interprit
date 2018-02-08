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
  addLoggingToStore
} = require('../lib/middleware');

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
  fork,
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
 * A process that listens for
 * events on a stream and outputs
 * events to another stream
 */
function* streamProcess() {
  while (true) {
    const data = yield takeStream(process.stdin);
    yield putStream(process.stdout, `message received: ${data}`);
  }
}

/**
 * A process that communicates with
 * another process over a socket / emitter
 * via events
 */
function* socketProcessOne({ socket }) {
  while (true) {
    yield call(delay, 2000);
    yield putEvent(socket, 'my_event', 'ping!');
    const data = yield takeEvent(socket, 'my_event');
    yield putStream(process.stdout, `(1) event received: ${data}\n`);
  }
}

/**
 * A process that communicates with
 * another process over a socket / emitter
 * via events
 */
function* socketProcessTwo({ socket }) {
  while (true) {
    const data = yield takeEvent(socket, 'my_event');
    yield putStream(process.stdout, `(2) event received: ${data}\n`);
    yield call(delay, 2000);
    yield putEvent(socket, 'my_event', 'pong!');
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* stdEchoProcess() {
  while (true) {
    const data = yield takeStream(process.stdin);
    yield putStream(process.stdout, `${data}`);
  }
}

/**
 * A process that races two async calls
 * and alternates who "wins" every turn
 */
function* raceProcess() {
  let delayTable = [200, 500, 1000, 1500];

  while (true) {
    /**
     * Race two async calls
     */
    const data = yield race([
      call(delay, delayTable[0], 10),
      call(delay, delayTable[1], 20),
      race([
        call(delay, delayTable[2], 30),
        call(delay, delayTable[3], 40),
      ]),
    ]);

    /**
     * Cycle the delay table
     */
    const last = delayTable.pop();
    delayTable.unshift(last);

    yield call(console.log, `${data}`);
  }
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
 * A process that runs two races in parallel
 * and alternates who "wins" every turn
 */
function* parallelProcess() {
  let delayTable = [200, 500, 1000, 1500];

  while (true) {
    /**
     * Perform two async races in parallel
     */
    const data = yield parallel([
      race([
        call((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(10);
            }, delayTable[0]);
          })
        }),
        call((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(20);
            }, delayTable[1]);
          })
        }),
      ]),
      race([
        call((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(30);
            }, delayTable[2]);
          })
        }),
        call((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(40);
            }, delayTable[3]);
          })
        }),
      ])
    ]);

    /**
     * Cycle the delay table
     */
    const last = delayTable.pop();
    delayTable.unshift(last);

    /**
     * TODO: Implement apply effect
     * that handles calling methods
     * with correct this context
     */
    yield call(console.log.bind(console), `${data}`);
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
   * TODO:
   *
   * Create channels / emitters for
   * - input (key, stdin)
   * - events
   * - sockets
   * - streams
   * - what else..?
   *
   * CSP (Communicating Sequencial Processes) ?
   *
   * NOTE:
   * - eventEmitters/sockets do not have buffering and are asynchronous
   * - csp channels have buffering and are "synchronous" (put will wait until message is taken)
   *
   */
  const socket = new EventEmitter();

  /**
   * Create an interpreter
   */
  const interpreter = createInterpreter({
    call,
    callProc,
    cps,
    race,
    fork,
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
    // streamProcess,
    // socketProcessOne,
    // socketProcessTwo,
    // stdEchoProcess,
    // raceProcess,
    // parallelProcess,
    // slowEchoProcess,
    // slowPrintEcho,
  ];

  /**
   * Arguments for each process,
   * dependencies
   * - channels
   * - emitters
   * - streams
   * - whatever is needed as injected deps
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
    interpreter(proc, context, finalHandler, args);
  });
}

/**
 * Start the application
 */
application();
