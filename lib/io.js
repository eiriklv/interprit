/**
 * Dependencies
 */
const minimatch = require('minimatch');

/**
 * Helper function for matching patterns
 */
function typeMatchesPattern({ type }) {
  return function ({ pattern }) {
    return minimatch(type, pattern);
  }
}

/**
 * Simple IO implementation
 *
 * NOTE: This is really just a simple implementation of pub/sub
 */
function createIO() {
  /**
   * Keep subscribers in a list
   */
  const subscribers = [];

  /**
   * Method that enables you to dispatch
   * an action into the system
   *
   * TODO: Rename this to publish
   */
  const dispatch = (action) => {
    subscribers
    .filter(typeMatchesPattern(action))
    .forEach(({ fn = () => { console.log('No listener..') } } = {}) => {
      setImmediate(() => fn(action));
    });
  };

  /**
   * Method that enables you to subscribe
   * to dispatches of actions in the system
   */
  const subscribe = (fn, pattern) => {
    const subscriber = { fn, pattern };
    subscribers.push(subscriber);
    return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
  };

  /**
   * Return interface
   */
  return {
    dispatch,
    subscribe,
  };
}

/**
 * Exports
 */
module.exports = { createIO };
