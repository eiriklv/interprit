/**
 * Dependencies
 */
const uuid = require('uuid');

/**
 * Helpers
 */
const { isSpecObject } = require('./utils');

/**
 * Create a resolver than will resolve the
 * yields of effect descriptions
 */
function createEffectsResolver(effects) {
  /**
   * Return a function that where the interpreter
   * can inject a reference to itself and the
   * context to be able to call itself recursively
   */
  return function(interpreter, context, io, task) {
    /**
     * Return the actual effects resolver
     * that will be used to resolve effects
     */
    return function resolveEffects(
      effect = {},
      cb = () => { console.warn('No callback passed for resolving effect') }
    ) {
      /**
       * Make sure we only resolve valid effect descriptions,
       * all other values are returned unchanged
       */
      if (!isSpecObject(effect)) {
        console.warn('Warning: yielded a non-effect (make sure this was intentional)', effect);
        return cb(null, effect);
      }

      /**
       * Create a bundle of the engine itself (for recursive application)
       */
      const engine = {
        resolveEffects,
        interpreter,
        context,
      };

      /**
       * Create a hash of resolvers mapped to their type + a default for non-existing effects
       *
       * NOTE: This results in something like this:
       *
       * {
       *   '@@take': (...) => { ... },
       *   '@@put': (...) => { ... },
       *   ...
       * }
       */
      const resolvers = Object.keys(effects)
      .map((effect) => effects[effect])
      .reduce((result, describe) => Object.assign({}, result, {
        [describe().type]: describe.resolve,
      }), {
        default: (effect) => cb(new Error(`Unrecognized effect type: ${effect.type}`)),
      });

      /**
       * Select the appropriate resolver
       */
      const resolve = resolvers[effect.type] || resolvers.default;

      /**
       * Resolve the effect and return the result
       */
      return resolve(effect, io, engine, task, cb);
    }
  }
}

/**
 * Create a middleware application function
 */
function createMiddlewareApplicator(middlewares = []) {
  return function(effect) {
    return middlewares.reduce(function(effect, middleware) {
      return middleware(effect);
    }, effect);
  };
}

/**
 * The interpreter responsible
 * of running / stepping through
 * our program, and to handle all yields
 *
 * Our very basic interpreter just handles
 * all yields by returning the yielded value
 */
function createInterpreter(
  middleware = [],
  effects = {},
  io = {}
) {
  /**
   * Create effects resolver based on available effects
   */
  const effectsResolver = createEffectsResolver(effects);

  /**
   * Create middleware applicator
   */
  const applyMiddleware = createMiddlewareApplicator(middleware);

  /**
   * Return a interpreter / runner function
   * that will automatically run all the
   * middlewares before running the program
   */
  return function interpreter(
    program = function* () {},
    parentContext = {},
    finalHandler = function () {},
    ...args
  ) {
    /**
     * NOTE: Part of the task object
     *
     * Create holders of the task state
     */
    const id = uuid.v4();
    let result = undefined;
    let error = undefined;
    let isRunning = true;
    let isCancelled = false;
    const attachedForks = [];

    /**
     * NOTE: Part of the task object
     *
     * Create a externally resolvable Promise
     */
    let resolvePromise;
    let rejectPromise;
    const done = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    /**
     * NOTE: Part of the task object
     *
     * Create a context that inherits from the parent context
     */
    let context = Object.create(parentContext);

    /**
     * Create an iterator from the program generator
     */
    const iterator = program.call(context, ...args);

    /**
     * Create the task object representing the generator / process
     */
    const task = {
      id: () => id,
      isRunning: () => isRunning,
      isCancelled: () => isCancelled,
      result: () => result,
      error: () => error,
      cancel: () => {
        /**
         * Set all the appropriate values on the task object
         */
        isRunning = false;
        isCancelled = true;

        /**
         * Cancel attached forks
         * (This will trigger a nested / recursive cancel)
         */
        attachedForks.forEach((task) => task.cancel());

        /**
         * Reject the task promise
         */
        resolvePromise(result);

        /**
         * Continue the process
         */
        resolveYieldRecursively(iterator.return(result));
      },
      attachFork: (task) => {
        /**
         * Attach a fork / task to the current process
         */
        attachedForks.push(task);
      },
      detachFork: (task) => {
        /**
         * Detach a fork / task from the current process
         */
        attachedForks.splice(attachedForks.indexOf(task), 1);
      },
      /**
       * Task context
       */
      context,
      /**
       * Task promise
       */
      done,
    };

    /**
     * Create an instance of the effects resolver where
     * we inject the interpreter recursively, to be able to
     * yield forks and spawns of nested processes
     */
    const resolveYield = effectsResolver(interpreter, parentContext, io, task);

    /**
     * Initialize the iterator
     */
    const initialState = iterator.next();

    /**
     * Step through the entire program flow using the iterator,
     * while we also handle all the yield statements in our program flow
     * (here we just return the yielded value)
     */
    function resolveYieldRecursively(state) {
      /**
       * If the generator has run to completion we
       * update the state of the task object and
       * break out of the recursive resolving of effects
       *
       * Also calls the final handler with
       * the context and final result / return
       */
      if (state.done) {
        /**
         * Set all the task object fields before calling the final handler
         * and returning the resulting task
         */
        isRunning = false;
        result = state.value;
        resolvePromise(state.value);
        return finalHandler.call(context, null, state.value);
      }

      /**
       * Continue to resolve the yielded value
       * if the generator has not run to completion yet
       */
      resolveYield(applyMiddleware(state.value), function (err, result) {
        /**
         * Handle effect resolving errors
         */
        if (err) {
          isRunning = false;
          error = err;
          rejectPromise(err);
          return iterator.throw(err);
        }

        /**
         * Yield back to the generator / process
         * with the resolved effect / value
         */
        const nextState = iterator.next(result);

        /**
         * Continue stepping through the flow and resolving
         * yields if the generator has not run to completion yet
         */
        resolveYieldRecursively(nextState);
      });
    }

    /**
     * Start stepping through the program(s)
     */
    resolveYieldRecursively(initialState);

    /**
     * Return the task object
     */
    return task;
  }
}

module.exports = createInterpreter;
