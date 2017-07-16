/**
 * Debug flag
 */
const DEBUG = false;

/**
 * Create a middleware for logging
 */
function addLoggingToStore(options) {
  return (store) => {
    return (next) => {
      return (action) => {
        console.log(`* dispatching ${action.type} with logging middleware *`);
        return next(action);
      };
    };
  };
}

/**
 * Create a middleware for action creators
 */
function addActionCreatorsToStore(extraArguments) {
  return (store) => {
    return (next) => {
      return (action) => {
        DEBUG && console.log('* dispatching with action creator middleware *', action.type);
        if (typeof action === 'function') {
          return action(store.dispatch, store.getState, extraArguments);
        } else {
          return next(action);
        }
      };
    };
  };
}

/**
 * Create a middleware for adding reactors
 */
function addActionTakersToStore(options) {
  /**
   * Create an array to hold listeners/subscribers/waiters for action dispatches
   */
  const dispatchTakers = [];

  /**
   * Create a store enhancer that enables you
   * to add custom listeners for actions as
   * promises that will be resolved on a dispatched
   * action of the type taken
   */
  const storeEnhancer = (store) => {
    return (next) => {
      /**
       * Patch store.dispatch to add the epic functionality
       */
      return (action) => {
        DEBUG && console.log('* dispatching with action taker middleware *', action.type);
        /**
         * Match any dispatchTakers with the
         * same action type, or dispatchTakers with
         * no action type specified (waits for any action)
         */
        const filteredDispatchTakers = dispatchTakers
        .filter(({ actionType }) => (
          !actionType ||
          (action.type && action.type === actionType)
        ));

        /**
         * Resolve any applicable epic dispatchTakers
         */
        filteredDispatchTakers
        .slice()
        .forEach(taker => {
          /**
           * Remove the taker from the list of takers
           */
          dispatchTakers.splice(dispatchTakers.indexOf(taker), 1);

          /**
           * Resolve the taker in the next tick
           */
          setImmediate(() => {
            taker.resolve(action);
          });
        });

        /**
         * Wait for the next tick to resolve the promise
         * to enable the process to move on to the next
         * event
         */
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            resolve(next(action));
          });
        });
      };
    };
  };

  /**
   * Create a function that enables reactors to wait
   * for actions to be dispatched (single occurence)
   *
   * NOTE: We're monkey patching the middleware
   */
  storeEnhancer.take = (actionType) => {
    DEBUG && console.log('adding taker for', actionType, Date.now());

    /**
     * Return a promise that will be resolved when
     * a specified action is dispatched
     */
    return new Promise((resolve) => {
      /**
       * Push a representation of the awaited action
       * and the resolver function into the dispatch takers
       */
      dispatchTakers.push({ actionType, resolve });
    });
  };

  /**
   * Return store enhancer
   */
  return storeEnhancer;
}

/**
 * Create a middleware for adding reactors
 */
function addActionSubscribersToStore(options) {
  /**
   * Create an array to hold listeners/subscribers/waiters for action dispatches
   */
  const actionSubscribers = [];

  /**
   * Create a store enhancer that enables you
   * to add custom listeners for actions as
   * promises that will be resolved on a dispatched
   * action of the type taken
   */
  const storeEnhancer = (store) => {
    return (next) => {
      /**
       * Patch store.dispatch
       */
      return (action) => {
        DEBUG && console.log('* dispatching with action taker middleware *', action.type);
        /**
         * Match any actionSubscribers with the
         * same action type, or actionSubscribers with
         * no action type specified (waits for any action)
         */
        const filteredActionSubscribers = actionSubscribers
        .filter(({ actionType }) => (
          !actionType ||
          (action.type && action.type === actionType)
        ));

        /**
         * Resolve any applicable epic actionSubscribers
         */
        filteredActionSubscribers
        .slice()
        .forEach(subscriber => {
          subscriber(action);
        });

        /**
         * Run the rest of the chain
         */
        return next(action);
      };
    };
  };

  /**
   * Create a function to add subscribers
   * to actions being dispatched
   *
   * NOTE: We're monkey patching the middleware
   */
  storeEnhancer.subscribe = (actionType, fn) => {
    DEBUG && console.log('adding subscriber for', actionType, Date.now());

    /**
     * Add a subscription to an action
     */
    actionSubscribers.push({ actionType, fn });

    /**
     * Return a function to unsubscribe itself
     */
    return () => {
      DEBUG && console.log('removing subscriber for', actionType, Date.now());
      actionSubscribers.splice(actionSubscribers.indexOf(fn), 1);
    };
  };

  /**
   * Return store enhancer
   */
  return storeEnhancer;
}

/**
 * Create a middleware for adding reactors
 */
function addDispatchSubscriptionToStore(options) {
  /**
   * Create an array to hold listeners/subscribers/waiters for action dispatches
   */
  const subscribers = [];

  /**
   * Create a store enhancer that enables you
   * to add custom listeners for actions as
   * promises that will be resolved on a dispatched
   * action of the type taken
   */
  const storeEnhancer = (store) => {
    return (next) => {
      /**
       * Patch store.dispatch
       */
      return (action) => {
        console.log('* dispatching with subscription middleware *', action.type);

        /**
         * Call all subscribers
         *
         * NOTE: If we don't filter the array here one of the
         * values will be skipped.. WTF is going on??
         */
        subscribers
        .filter(x => x) // ????? Need this to work
        .forEach((subscriber, i) => {
          setImmediate(() => subscriber(action));
        });

        console.log('done running all subscribers for', action.type);

        /**
         * Run the rest of the chain
         */
        console.log('getting ready to dispatch with next dispatcher for', action.type);
        return next(action);
      };
    };
  };

  /**
   * Create a function to add subscribers to dispatch
   *
   * NOTE: We're monkey patching the middleware
   */
  storeEnhancer.subscribe = (fn) => {
    DEBUG && console.log('adding subscriber for dispatch', Date.now());

    /**
     * Add subscription to dispatch
     */
    subscribers.push(fn);

    /**
     * Return a function to unsubscribe itself
     */
    return () => {
      DEBUG && console.log('removing subscriber for dispatch', Date.now());
      subscribers.splice(subscribers.indexOf(fn), 1);
    };
  };

  /**
   * Return store enhancer
   */
  return storeEnhancer;
}

/**
 * Exports
 */
module.exports = {
  addLoggingToStore,
  addActionCreatorsToStore,
  addActionTakersToStore,
  addActionSubscribersToStore,
  addDispatchSubscriptionToStore,
};
