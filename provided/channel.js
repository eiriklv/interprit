/**
 * Import dependencies
 */
const { sliding } = require('./buffer');

/**
 * Import utils
 */
const { isFunction, once } = require('../utils');

/**
 * End message symbol
 */
const END = module.exports.END = Symbol('@@channel_end');

/**
 * End message check
 */
const isEndOfChannel = module.exports.isEndOfChannel = (input) => input === END;

/**
 * Channel implementation
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

      if (isClosed && !messages) {
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
 * Event emitter / subscriber channel implementation
 */
const eventChannel = module.exports.eventChannel = function eventChannel(subscriber, buffer) {
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
