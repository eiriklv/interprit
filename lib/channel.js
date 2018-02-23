/**
 * Import dependencies
 */
const uuid = require('uuid');

/**
 * Import buffers
 */
const { sliding, none } = require('./buffer');

/**
 * Import utils
 */
const { isFunction, once } = require('./utils');

/**
 * End message symbol for channels
 */
const END = module.exports.END = Symbol('@@channel_end');

/**
 * End message check for channels
 */
const isEndOfChannel = module.exports.isEndOfChannel = (input) => input === END;

/**
 * Async channel implementation (buffered)
 *
 * NOTE: Put operations will NOT block
 */
const channel = module.exports.channel = function channel(buffer) {
  buffer = buffer || sliding(10);

  let isClosed = false;
  let takers = [];

  return {
    put(msg) {
      if (isClosed) {
        return;
      }

      if (takers.length) {
        const taker = takers.shift();
        taker(msg);
      } else {
        buffer.put(msg);
      }
    },
    take(callback) {
      if (!buffer.isEmpty()) {
        const msg = buffer.take();
        callback(msg);
      } else if (buffer.isEmpty() && isClosed) {
        callback(END);
      } else {
        takers.push(callback);
      }
    },
    flush(callback) {
      const messages = [];

      while (!buffer.isEmpty()) {
        messages.push(buffer.take())
      }

      if (isClosed && !messages.length) {
        callback(END);
      } else {
        callback(messages);
      }
    },
    close() {
      isClosed = true;

      while (takers.length) {
        const taker = takers.shift();
        taker(END);
      }
    }
  }
}

/**
 * Synchronous channel implementation
 *
 * NOTE: Put operations will block
 */
const syncChannel = module.exports.syncChannel = function syncChannel() {
  let isClosed = false;
  let puters = [];
  let takers = [];

  return {
    put(msg, callback) {
      if (isClosed) {
        return callback(END);
      }

      if (takers.length) {
        const taker = takers.shift();
        taker(msg);
        callback();
      } else {
        puters.push({ msg, ack: callback });
      }
    },
    take(callback) {
      if (puters.length) {
        const { msg, ack } = puters.shift();
        callback(msg);
        ack();
      } else if (!puters.length && isClosed) {
        callback(END);
      } else {
        takers.push(callback);
      }
    },
    flush(callback) {
      const messages = []

      while (puters.length) {
        const { msg, ack } = puters.shift();
        ack();
        messages.push(msg);
      }

      if (isClosed && !messages.length) {
        callback(END);
      } else {
        callback(messages);
      }
    },
    close() {
      isClosed = true;

      while (takers.length) {
        const taker = takers.shift();
        taker(END);
      }

      while (puters.length) {
        const { ack } = puters.shift();
        ack(END);
      }
    }
  }
}

/**
 * Event emitter / subscriber channel implementation
 */
const eventChannel = module.exports.eventChannel = function eventChannel(subscriber, buffer = none()) {
  let isClosed = false;
  let unsubscribe;

  const chan = channel(buffer);

  const close = () => {
    if (isFunction(unsubscribe)) {
      unsubscribe();
    }

    chan.close();
  }

  unsubscribe = subscriber((input) => {
    if (isEndOfChannel(input)) {
      isClosed = true;
      return close();
    }

    chan.put(input);
  });

  if (!isFunction(unsubscribe)) {
    throw new Error('eventChannel: subscribe should return a function to unsubscribe');
  }

  unsubscribe = once(unsubscribe);

  if (isClosed) {
    unsubscribe();
  }

  return {
    take: chan.take,
    flush: chan.flush,
    close,
  };
}

/**
 * Channel with request-response semantics
 */
const requestResponseChannel = module.exports.requestResponseChannel = function requestResponseChannel() {
  let isClosed = false;

  const requests = [];
  const responses = [];
  const requestTakers = [];
  const responseTakers = [];

  const putRequest = (body) => {
    if (isClosed) {
      return;
    }

    const id = uuid.v4();
    const request = { id, body };

    if (requestTakers.length) {
      const requestTaker = requestTakers.shift();
      requestTaker(request);
    } else {
      requests.push(request);
    }

    return id;
  }

  const takeRequest = (cb) => {
    if (isClosed) {
      return cb(END);
    }

    if (requests.length) {
      const request = requests.shift();
      cb(request);
    } else {
      requestTakers.push(cb);
    }
  }

  const putResponse = (requestId, response) => {
    if (isClosed) {
      return;
    }

    const responseTaker = responseTakers.find(({ id } = {}) => requestId === id);

    if (responseTaker) {
      responseTakers.splice(responseTakers.indexOf(responseTaker), 1);
      responseTaker.cb(response);
    } else {
      responses.push({ id: requestId, body: response });
    }
  }

  const takeResponse = (requestId, cb) => {
    if (isClosed) {
      return cb(END);
    }

    const response = responses.find(({ id } = {}) => requestId === id);

    if (response) {
      responses.splice(responses.indexOf(response), 1);
      cb(response.body);
    } else {
      responseTakers.push({ id: requestId, cb });
    }
  }

  const close = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    requestTakers.forEach(({ cb }) => cb(END));
    responseTakers.forEach(({ cb }) => cb(END));
  }

  return {
    putRequest,
    takeRequest,
    putResponse,
    takeResponse,
    close,
  };
}

/**
 * Channel with request-response semantics connected to a source
 */
const requestResponseSourceChannel = module.exports.requestResponseSourceChannel = function requestResponseSourceChannel(
  subscribe,
  handleResponse,
) {
  let isClosed = false;
  let unsubscribe;

  const requests = [];

  const chan = requestResponseChannel();

  const close = () => {
    if (isFunction(unsubscribe)) {
      unsubscribe();
    }

    chan.close();
  }

  unsubscribe = subscribe((request) => {
    if (isEndOfChannel(request)) {
      isClosed = true;
      return close();
    }
    const id = chan.putRequest(request);
    chan.takeResponse(id, (response) => handleResponse(request, response));
  });

  if (!isFunction(unsubscribe)) {
    throw new Error('requestResponseSourceChannel: subscribe should return a function to unsubscribe');
  }

  unsubscribe = once(unsubscribe);

  if (isClosed) {
    unsubscribe();
  }

  return {
    takeRequest: chan.takeRequest,
    putResponse: chan.putResponse,
    close,
  };
}
