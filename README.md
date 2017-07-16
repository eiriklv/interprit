edge-effects
============

__NOTE:__ Mostly for educative and exploratory purposes for now.

Pluggable runtime effects engine (think redux-saga, except you define your own set of effects and higher order effects).

See [this talk](https://vimeo.com/215355409) for some of the motivations of building this (and pushing side effects to the edge).

## Usage

### Creating an effects runtime/interpreter:

```js
const createRuntime = require('edge-effects');

/**
 * Creating a runtime from middleware, effects and io
 */
const runtime = createRuntime(middleware = [], effects = {}, io = {});

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
 * Run your process with the runtime
 */
runtime(process, context, finalHandler, args);
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

Creating a set of effects you want your runtime to be able to resolve/handle.

```js
/**
 * Signature
 */
const effects = {
  effectName: {
    describe(your, own, args) {
      /**
       * Return a description of your effect
       */
      return {
        type: '@@your-own-type',
        your,
        own,
        args,
      };
    },
    resolve(description, io, engine, cb) {
      /**
       * Handle the resolving of the effect
       * and call back the result
       */
      cb();
    }
  }
}
```

Example:

```js
const effects = {
  /**
   * Create an effect bundle for calling
   * a function that returns a promise
   * or a value and might have side effects
   *
   * Handles an effect spec of the call type
   * which resolves both synchronous function
   * calls and function calls that returns a promise
   */
  call: {
    describe(func, ...args) {
      return {
        type: '@@call',
        func,
        args,
      };
    },
    resolve({ func, args }, io, engine, cb) {
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
    },
  },
  /**
   * Create an effect bundle for putting
   * an action into the system
   *
   * Handle an effect spec of the put-action
   * type which resolves dispatching actions
   * into the io system
   */
  put: {
    describe(action) {
      return {
        type: '@@put',
        action,
      };
    },
    resolve({ action }, { dispatch }, engine, cb) {
      cb(null, dispatch(action));
    },
  }
}
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
} = require('../provided/redux');

/**
 * Redux middleware
 */
const {
  addDispatchSubscriptionToStore,
  addLoggingToStore
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
  fork,
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
 * A process we want to run
 * that communicates with another
 * process by putting actions into
 * the event loop and listening for actions
 */
function* processOne() {
  while (true) {
    yield takeAction.describe('PING');
    yield call.describe(delay, 2000);
    yield putAction.describe({ type: 'PONG' });
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
    yield putAction.describe({ type: 'PING' });
    yield takeAction.describe('PONG');
    yield call.describe(delay, 2000);
  }
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
    const data = yield takeEvent(socket, 'my_event');
    yield putStream.describe(process.stdout, `(2) event received: ${data}\n`);
    yield call.describe(delay, 2000);
    yield putEvent.describe(socket, 'my_event', 'pong!');
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* stdEchoProcess() {
  while (true) {
    const data = yield takeStream.describe(process.stdin);
    yield putStream.describe(process.stdout, `${data}`);
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
    const data = yield race.describe([
      call.describe(delay, delayTable[0], 10),
      call.describe(delay, delayTable[1], 20),
      race.describe([
        call.describe(delay, delayTable[2], 30),
        call.describe(delay, delayTable[3], 40),
      ]),
    ]);

    /**
     * Cycle the delay table
     */
    const last = delayTable.pop();
    delayTable.unshift(last);

    yield call.describe(console.log, `${data}`);
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
    yield putStream.describe(process.stdout, char);
    yield call.describe(delay, interval);
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* slowEchoProcess() {
  while (true) {
    const data = yield takeStream.describe(process.stdin);
    yield* slowPrint(data.toString(), 50);
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* slowPrintEcho() {
  while (true) {
    const data = yield takeStream.describe(process.stdin);
    const chars = data.toString().split('');
    let currentChar;

    while (currentChar = chars.shift()) {
      yield putStream.describe(process.stdout, currentChar);
      yield call.describe(delay, 50);
    }
  }
}

/**
 * A process that waits for stdin
 * and outputs the data to stdout
 */
function* slowEchoForkProcess() {
  yield fork.describe(slowEchoProcess);
  yield fork.describe(slowEchoProcess);
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
    const data = yield parallel.describe([
      race.describe([
        call.describe((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(10);
            }, delayTable[0]);
          })
        }),
        call.describe((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(20);
            }, delayTable[1]);
          })
        }),
      ]),
      race.describe([
        call.describe((val) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(30);
            }, delayTable[2]);
          })
        }),
        call.describe((val) => {
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
    yield call.describe(console.log.bind(console), `${data}`);
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
   * Create a runtime
   */
  const runtime = createRuntime([logMiddleware], {
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
    runtime(proc, context, finalHandler, args);
  });
}

/**
 * Start the application
 */
application();
```
