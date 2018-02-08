/**
 * Dependencies
 */
const uuid = require('uuid');

/**
 * Import monitor event creators
 */
const {
  effectTriggered,
  effectResolved,
  effectRejected,
  effectAttached,
  effectDetached,
  taskCreated,
  taskCompleted,
  taskCancelled,
  taskAttached,
  taskDetached,
} = require('./monitor');

/**
 * Helpers
 */
const {
  isSpecObject,
} = require('./utils');

/**
 * Create a resolver than will resolve the
 * yields of effect descriptions
 */
function createEffectsResolver(effects, monitor) {
  /**
   * Return a function that where the interpreter
   * can inject a reference to itself and the
   * context to be able to call itself recursively
   */

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
   * Return effects resolver factory
   */
  return function(interpreter, context, io, task) {
    /**
     * Return the actual effects resolver
     * that will be used to resolve effects
     */
    return function resolveEffects(
      effect = {},
      cb = () => { console.warn('No callback passed for resolving effect') },
      parent,
    ) {
      /**
       * NOTE: Monitoring event
       */
      monitor && monitor(effectTriggered(effect, parent));

      /**
       * Make sure we only resolve valid effect descriptions,
       * all other values are returned unchanged
       */
      if (!isSpecObject(effect)) {
        console.warn('Warning: yielded a non-effect (make sure this was intentional)', effect);

        /**
         * NOTE: Monitoring event
         */
        monitor && monitor(effectResolved(effect, result));

        /**
         * Call back with the effect itself as the resolved value
         */
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
       * Select the appropriate resolver
       */
      const resolve = resolvers[effect.type] || resolvers.default;

      /**
       * Resolve the effect and return the result
       */
      return resolve(effect, io, engine, task, (err, result) => {
        if (err) {
          /**
           * NOTE: Monitoring event
           */
          monitor && monitor(effectRejected(effect, err));

          /**
           * Call back with the error
           */
          cb(err);
        } else {
          /**
           * NOTE: Monitoring event
           */
          monitor && monitor(effectResolved(effect, result));

          /**
           * Call back with the result
           */
          cb(null, result);
        }
      });
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
  effects = {},
  io = {},
  middleware = [],
  monitor = console.log
) {
  /**
   * Create effects resolver based on available effects
   */
  const effectsResolver = createEffectsResolver(effects, monitor);

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
      id: uuid.v4(),
      type: program.name,
      result: undefined,
      error: undefined,
      running: true,
      cancelled: false,
      attachedForks: [],
      attachedEffects: [],
      isRunning: () => task.running,
      isCancelled: () => task.cancelled,
      cancel: () => {
        /**
         * Set all the appropriate values on the task object
         */
        task.running = false;
        task.cancelled = true;

        /**
         * Cancel attached forks
         * (This will trigger a nested / recursive cancel)
         */
        task.attachedForks.forEach((task) => task.cancel());

        /**
         * Reject the task promise
         */
        resolvePromise(task.result);

        /**
         * NOTE: Monitor event
         */
        monitor && monitor(taskCancelled(task));

        /**
         * Continue the process
         */
        resolveYieldRecursively(iterator.return(task.result));
      },
      attachFork: (taskToAttach) => {
        /**
         * Attach a fork / task to the current process
         */
        task.attachedForks.push(taskToAttach);

        /**
         * NOTE: Monitor event
         */
        monitor && monitor(taskAttached(task, taskToAttach));
      },
      detachFork: (taskToDetach) => {
        /**
         * Detach a fork / task from the current process
         */
        task.attachedForks.splice(task.attachedForks.indexOf(taskToDetach), 1);

        /**
         * NOTE: Monitor event
         */
        monitor && monitor(taskDetached(task, taskToAttach));
      },
      attachEffect: (effect) => {
        /**
         * Attach an effect to the task
         */
        task.attachedEffects.push(effect);

        /**
         * NOTE: Monitor event
         */
        monitor && monitor(effectAttached(effect, task));
      },
      detachEffect: (effect) => {
        /**
         * Detach an effect from the task
         */
        task.attachedEffects.splice(task.attachedEffects.indexOf(effect), 1);

        /**
         * NOTE: Monitor event
         */
        monitor && monitor(effectDetached(effect, task));
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
     * NOTE: Monitoring event
     */
    monitor && monitor(taskCreated(task));

    /**
     * Create an instance of the effects resolver where
     * we inject the interpreter recursively, to be able to
     * yield forks and spawns of nested processes / tasks
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
        if (task.error) {
          /**
           * Cancel all attached forks (recursively)
           */
          task.attachedForks.forEach((task) => task.cancel());

          /**
           * Reject the task promise
           */
          rejectPromise(task.error);
        } else {
          /**
           * Update the result of the task
           */
          task.result = state.value;

          /**
           * Resolve the task promise
           */
          resolvePromise(task.result);
        }

        /**
         * Update the task running state
         */
        task.running = false;

        /**
         * NOTE: Monitor event
         */
        monitor && monitor(taskCompleted(task, task.error, task.result));

        /**
         * Call final handler with result
         */
        return finalHandler.call(context, task.error, task.result);
      }

      /**
       * Attach effect to the task
       */
      task.attachEffect(state.value);

      /**
       * Continue to resolve the yielded value
       * if the generator has not run to completion yet
       */
      resolveYield(applyMiddleware(state.value), function (err, result) {
        /**
         * Detach effect from the task
         */
        task.detachEffect(state.value);

        /**
         * Create a placeholder for the next state of the generator
         */
        let nextState;

        /**
         * Handle effect resolving errors
         *
         * Check if this error will make the generator crash,
         * if so, we set the task error and keep resolving
         * to make the base handler take care of the rest
         */
        if (err) {
          try {
            /**
             * See what happens when we throw the error into the generator
             */
            nextState = iterator.throw(err);
          } catch (error) {
            /**
             * Update task error if the throwing of the error crashes the generator
             */
            task.error = error;
          }
        }

        /**
         * Make sure that we have a valid state to resolve,
         * so if throwing the error into the generator crashed it
         * (i.e - there was no try / catch there) we have to step
         * the generator to get a valid state
         */
        nextState = nextState || iterator.next(result);

        /**
         * Continue to recursively step through and resolve
         * the yields of the generator
         */
        resolveYieldRecursively(nextState);
      }, task);
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
