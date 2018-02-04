/**
 * Import dependencies
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
