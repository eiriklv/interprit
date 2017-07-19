/**
 * Import dependencies
 */
const { sliding } = require('./buffer');

/**
 * End message symbol
 */
const END = module.exports.END = Symbol('@@channel_end');

/**
 * Channel implementation
 */
module.exports.channel = function channel(buffer) {
  buffer = buffer || sliding(10);

  let isClosed = false;
  let takers = [];

  return {
    put(msg) {
      if (isClosed) {
        return;
      }

      if (takers.length) {
        const taker = takers.splice(0, 1);
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

      for (let i = 0; i < takers.length; i++) {
        const taker = takers.shift();
        taker(END);
      }
    }
  }
}

/**
 * TODO: Create an implementation of an event(emitter) channel
 */
const eventChannel = module.exports.eventChannel = function eventChannel() {}
