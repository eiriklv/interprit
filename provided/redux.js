/**
 * Debug flag
 */
const DEBUG = true;

/**
 * Create a function that enables you to extend
 * the redux store with middleware
 */
function applyMiddleware(...middlewares) {
  return (store) => {
    return middlewares
    .slice()
    .reverse()
    .reduce((store, middleware) => {
      store.dispatch = middleware(store)(store.dispatch);
      return store;
    }, store);
  }
};

/**
 * Create a super simple implementation of Redux
 */
function createStore(
  reducer = (state, action) => state,
  storeEnhancer = (store) => store
) {
  /**
   * Create an list that will hold
   * any action ever dispatched to the store
   */
  const actions = [];

  /**
   * Create an initial representation of the subscribers
   */
  const subscribers = [];

  /**
   * Create the original dispatch function
   * for the store
   */
  const dispatch = (action) => {
    console.log('* dispatching with pure dispatch *', action.type);

    /**
     * Push the dispatched action to our list
     * holding all actions ever dispatched
     *
     * NOTE: We're not actually keeping any state
     * in the store, but rather the action log,
     * which serves as the main source of truth
     * which the current state can be derived from.
     */
    actions.push(action);

    /**
     * Run all subscribers
     */
    subscribers.forEach(subscriber => {
      subscriber();
    });
  };

  /**
   * Create a function that returns the current state of the store
   * by recreating it from scratch
   *
   * NOTE: Yes this is slow and will increase in slowness,
   * but it is just for educational purposes where we want
   * to show that the state can be derived from reducing all
   * actions that have ever been dispatched into the current state
   *
   * This will also give us the possibility to do things such as time travel
   */
  const getState = () => {
    return actions.reduce(reducer, undefined);
  };

  /**
   * Create a function that enables you to add subscribers (function)
   * to state changes
   */
  const subscribe = (fn) => {
    subscribers.push(fn);
    return () => subscribers.splice(subscribers.indexOf(fn), 1);
  };

  /**
   * Initialize store with an empty action
   */
  dispatch({ type: '@@INIT' });

  /**
   * Return the store and containing methods
   */
  return storeEnhancer({
    getState,
    subscribe,
    dispatch,
  });
};

/**
 * Exports
 */
module.exports = {
  createStore,
  applyMiddleware,
};
