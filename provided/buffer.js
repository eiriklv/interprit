/**
 * Empty buffer
 */
module.exports.none = function none() {
  return {
    put() {},
    take() {},
    isEmpty() {
      return true;
    },
  }
};

/**
 * Dropping buffer
 */
module.exports.dropping = function dropping(limit = 10) {
  let buffer = [];

  return {
    put(msg) {
      buffer = [...buffer, msg].slice(0, limit);
    },
    take() {
      return buffer.shift();
    },
    isEmpty() {
      return !buffer.length;
    },
  }
};

/**
 * Sliding buffer
 */
module.exports.sliding = function sliding(limit = 10) {
  let buffer = [];

  return {
    put(msg) {
      buffer = [...buffer, msg].slice().reverse().slice(0, limit).reverse()
    },
    take() {
      return buffer.shift();
    },
    isEmpty() {
      return !buffer.length;
    },
  }
};
