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
   * Noop method for getting state
   */
  const getState = () => {};

  /**
   * Method that enables you to dispatch
   * an action into the system
   *
   * TODO: Rename this to publish
   */
  const dispatch = (action) => {
    subscribers
    .filter(typeMatchesPattern(action))
    .forEach(({ cb = () => { console.log('No listener..') } } = {}) => {
      setImmediate(() => cb(action));
    });
  };

  /**
   * Method that enables you to subscribe
   * to dispatches of actions in the system
   */
  const subscribe = (cb, pattern) => {
    const subscriber = { cb, pattern };
    subscribers.push(subscriber);
    return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
  };

  /**
   * Return interface
   */
  return {
    dispatch,
    subscribe,
    getState,
  };
}

/**
 * Simple IO implementation with state
 *
 * NOTE: This is really just a simple implementation of
 * pub/sub with global state that can be selected
 */
function createIOWithState(reducer = () => {}) {
  /**
   * Keep subscribers in a list
   */
  const subscribers = [];

  /**
   * Keep a global state for the IO
   */
  let state = reducer();

  /**
   * Method to select state
   */
  const getState = (selector = (state) => state) => {
    return selector(state);
  };

  /**
   * Method that enables you to dispatch
   * an action into the system
   *
   * TODO: Rename this to publish
   */
  const dispatch = (action) => {
    /**
     * Update the state
     */
    state = reducer(state, action);

    /**
     * Notify all subscribers
     */
    subscribers
    .filter(typeMatchesPattern(action))
    .forEach(({ cb = () => { console.log('No listener..') } } = {}) => {
      setImmediate(() => cb(action));
    });
  };

  /**
   * Method that enables you to subscribe
   * to dispatches of actions in the system
   */
  const subscribe = (cb, pattern) => {
    const subscriber = { cb, pattern };
    subscribers.push(subscriber);
    return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
  };

  /**
   * Return interface
   */
  return {
    dispatch,
    subscribe,
    getState,
  };
}

/**
 * Simple IO implementation with state
 *
 * NOTE: This is really just a simple implementation of
 * pub/sub with global state that can be selected
 */
function createIOWithStateTransitions(reducer = () => {}) {
  /**
   * Keep subscribers in a list
   */
  const subscribers = [];

  /**
   * Keep a global state for the IO
   */
  let state = reducer();

  /**
   * Method to select state
   */
  const getState = (selector = (state) => state) => {
    return selector(state);
  };

  /**
   * Method that enables you to dispatch
   * an action into the system
   *
   * TODO: Rename this to publish
   */
  const dispatch = (action) => {
    /**
     * Update the state
     */
    const previousState = state;
    const currentState = reducer(state, action);
    state = currentState;

    /**
     * Notify all subscribers
     */
    subscribers
    .filter(typeMatchesPattern(action))
    .forEach(({ cb = () => { console.log('No listener..') } } = {}) => {
      setImmediate(() => cb([action, currentState, previousState]));
    });
  };

  /**
   * Method that enables you to subscribe
   * to dispatches of actions in the system
   */
  const subscribe = (cb, pattern) => {
    const subscriber = { cb, pattern };
    subscribers.push(subscriber);
    return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
  };

  /**
   * Return interface
   */
  return {
    dispatch,
    subscribe,
    getState,
  };
}

/**
 * Exports
 */
module.exports = { createIO, createIOWithState, createIOWithStateTransitions };
