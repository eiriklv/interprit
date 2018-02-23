/**
 * Import dependencies
 */
const isGenerator = require('is-generator-function');
const isPromise = require('is-promise');
const isFunction = require('is-function');
const isObject = require('is-object');

/**
 * Export dependencies
 */
module.exports.isPromise = isPromise;
module.exports.isGenerator = isGenerator;
module.exports.isFunction = isFunction;
module.exports.isObject = isObject;

/**
 * Check if an object is a spec object (effect or task)
 */
const isSpecObject = module.exports.isSpecObject = function isSpecObject(obj) {
  return (
    isObject(obj) &&
    typeof obj.type === 'string' &&
    !!obj.type
  );
}

/**
 * Check if an object is an effect
 */
const isEffect = module.exports.isEffect = function isEffect(obj) {
  return isSpecObject(obj) && obj.type.includes('@@');
};

/**
 * Promise of a value with a specific delay
 */
const delay = module.exports.delay = function delay(ms, val) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(val);
    }, ms);
  });
}

/**
 * Make sure a function is only called once
 */
const once = module.exports.once = function once(func) {
  let called = false;

  return () => {
    if (called) {
      return;
    } else {
      called = true;
      func();
    }
  };
}

/**
 * Create a "safe" promise from a regular promise
 */
const safePromise = module.exports.safePromise = function safePromise(promise) {
  return promise
  .then(result => [null, result])
  .catch(error => [error, null]);
}
