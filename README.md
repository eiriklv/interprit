interprit
=========

[![npm version](https://badge.fury.io/js/interprit.svg)](https://badge.fury.io/js/interprit)

__NOTE:__ Mostly for educative and exploratory purposes for now.

Pluggable interpreter and effects engine (think redux-saga, except you define your own set of effects and higher order effects).

See [this talk](https://www.youtube.com/watch?v=TLm-i5sVlNM) for some of the motivations of building this (and pushing side effects to the edge).

## Usage

### Creating an effects interpreter/runtime:

```js
const createInterpreter = require('interprit');

/**
 * Creating an interpreter from middleware, effects and io
 */
const interpreter = createInterpreter(middleware = [], effects = {}, io = {});

/**
 * Create a final handler that will be called when your process has completed
 */
const finalHandler = function () { ... };

/**
 * Create a shared context that your processes might use as shared memory
 */
const context = { ... };

/**
 * Create an object of arguments that will be passed to your process
 */
const args = { ... };

/**
 * Create a process to run
 */
const process = function* () { ... };

/**
 * Run your process with the interpreter
 */
interpreter(process, context, finalHandler, args);
```

### IO:

Define the interface for:

- dispatching events into the system
- subscribing to events in the system
- getting the state of the system (optional)

```js
const io = {
  dispatch: store.dispatch,
  subscribe: subscribeToDispatchMiddleware.subscribe,
  getState: store.getState,
}
```

### Effects (descriptors + resolvers):

Creating a set of effects you want your interpreter to be able to resolve/handle.

```js
/**
 * Effect Description Signature
 */
const effectName = function describeEffectName(your, own, args) {
  /**
   * Return a description of your effect
   */
  return {
    type: '@@your-own-type',
    your,
    own,
    args,
  };
}

/**
 * Effect Resolver Signature
 * NOTE: Attached to the effect description signature (!)
 */
effectName.resolve = function resolveEffectName(description, io, engine, parentTask, cb) {
  /**
   * Handle the resolving of the effect
   * and call back the result
   */
  cb();
}

/**
 * Effects Object Signature
 */
const effects = {
  effectName,
};
```

Example:

```js
/**
 * Create an effect bundle for calling
 * a function that returns a promise
 * or a value and might have side effects
 *
 * Handles an effect spec of the call type
 * which resolves both synchronous function
 * calls and function calls that returns a promise
 */
const call = function describeCall(func, ...args) {
  return {
    type: '@@call',
    func,
    args,
  };
};

call.resolve = function resolveCall({ func, args }, io, engine, parentTask, cb) {
  let result;
  let error;

  try {
    result = func(...args);
  } catch (e) {
    error = e;
  }

  return (error ? Promise.reject(error) : Promise.resolve(result))
  .then((res) => cb(null, res))
  .catch((err) => cb(err));
};

const put = function describePut(action) {
  return {
    type: '@@put',
    action,
  };
};

/**
 * Create an effect bundle for putting
 * an action into the system
 *
 * Handle an effect spec of the put-action
 * type which resolves dispatching actions
 * into the io system
 */
put.resolve = function resolvePut({ action }, { dispatch }, engine, parentTask, cb) {
  cb(null, dispatch(action));
};

/**
 * Create an effects bundle that can be used by the engine
 */
const effects = {
  call,
  put,
};
```

## Examples

```js
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
 * A process we want to run
 * that communicates with another
 * process by putting actions into
 * the event loop and listening for actions
 */
function* processOne() {
  while (true) {
    yield takeAction('PING');
    yield call(delay, 2000);
    yield putAction({ type: 'PONG' });
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
    yield putAction({ type: 'PING' });
    yield takeAction('PONG');
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
   *
   * - eventEmitters/sockets do not have buffering and are asynchronous
   * - csp channels have buffering and are "synchronous" (put will wait until message is taken)
   *
   */
  const socket = new EventEmitter();

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
    processOne,
    processTwo,
    streamProcess,
    socketProcessOne,
    socketProcessTwo,
    stdEchoProcess,
    raceProcess,
    parallelProcess,
    slowEchoProcess,
    slowPrintEcho,
  ];

  /**
   * Arguments for each process,
   * dependencies
   * - channels
   * - emitters
   * - streams
   * - whatever is needed as injected dependencies
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
```
