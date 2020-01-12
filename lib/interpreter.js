/**
 * Dependencies
 */
const uuid = require('uuid');
const debug = require('debug')('interprit:engine');

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
  taskTerminated,
  taskCancelled,
  taskAttached,
  taskDetached,
} = require('./monitor');

/**
 * Helpers
 */
const {
  isEffect,
} = require('./utils');

/**
 * Channels
 */
const {
  channel,
} = require('./channel');

/**
 * Create a resolver than will resolve the
 * yields of effect descriptions
 */
function createEffectsResolver(effects, onMonitorEvent) {
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
    default: (effect, io, engine, parentTask, cb) => {
      cb(new Error(`Unrecognized effect type: ${effect.type}`));
    },
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
      onMonitorEvent(effectTriggered(effect, parent));

      /**
       * Make sure we only resolve valid effect descriptions,
       * all other values are returned unchanged
       */
      if (!isEffect(effect)) {
        console.warn('Warning: yielded a non-effect (make sure this was intentional)', effect);

        /**
         * NOTE: Monitoring event
         */
        onMonitorEvent(effectResolved(effect, effect));

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
          onMonitorEvent(effectRejected(effect, err));

          /**
           * Call back with the error
           */
          cb(err);
        } else {
          /**
           * NOTE: Monitoring event
           */
          onMonitorEvent(effectResolved(effect, result));

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
  onMonitorEvent = () => {}
) {
  /**
   * Create effects resolver based on available effects
   */
  const effectsResolver = createEffectsResolver(effects, onMonitorEvent);

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
      isCompleted: false,
      isRunning: true,
      isCancelled: false,
      isTerminated: false,
      attachedForks: [],
      attachedEffects: [],
      messages: channel(),
      cancel: () => {
        debug(`cancelling ${task.type}:${task.id}`);
        /**
         * Set all the appropriate values on the task object
         */
        task.isCompleted = true;
        task.isCancelled = true;

        /**
         * Cancel attached forks
         * (This will trigger a nested / recursive cancel)
         */
        task.attachedForks.forEach((childTask) => {
          childTask.cancel();
          task.detachFork(childTask);
        });

        /**
         * Cancel all attached effects
         */
        task.attachedEffects.forEach((effect) => {
          //effect.cancel() // TODO
          task.detachEffect(effect);
        });

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(taskCancelled(task));

        /**
         * Continue the process
         */
        resolveYieldRecursively(iterator.return(task.result));
      },
      attachFork: (taskToAttach) => {
        debug(`attaching process ${taskToAttach.type}:${taskToAttach.id} to ${task.type}:${task.id}`);
        /**
         * Attach a fork / task to the current process
         */
        task.attachedForks.push(taskToAttach);

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(taskAttached(task, taskToAttach));
      },
      detachFork: (taskToDetach) => {
        debug(`detaching process ${taskToDetach.type}:${taskToDetach.id} from ${task.type}:${task.id}`);
        /**
         * Detach a fork / task from the current process
         */
        task.attachedForks.splice(task.attachedForks.indexOf(taskToDetach), 1);

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(taskDetached(task, taskToDetach));

        /**
         * Check if we should terminate the task
         * (might not be ready if the task has not finished yet)
         */
        task.terminateIfReady();
      },
      attachEffect: (effect) => {
        debug(`attaching effect ${effect.type}:${effect.id} to ${task.type}:${task.id}`);
        /**
         * Attach an effect to the task
         */
        task.attachedEffects.push(effect);

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(effectAttached(effect, task));
      },
      detachEffect: (effect) => {
        debug(`detaching effect ${effect.type}:${effect.id} from ${task.type}:${task.id}`);
        /**
         * Detach an effect from the task
         */
        task.attachedEffects.splice(task.attachedEffects.indexOf(effect), 1);

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(effectDetached(effect, task));
      },
      /**
       * Terminate task
       */
      terminateIfReady: () => {
        debug(`task ${task.type}:${task.id} terminating`);

        if (!task.isCompleted || task.attachedForks.length) {
          debug(`task ${task.type}:${task.id} not ready for termination`, { completed: task.isCompleted, forks: task.attachedForks.length });
          return;
        }

        if (task.isTerminated) {
          debug(`task ${task.type}:${task.id} already terminated`);
          return;
        }

        /**
         * Update the task state
         */
        task.isRunning = false;
        task.isTerminated = true;

        /**
         * Resolve or reject the task
         */
        if (task.error) {
          rejectPromise(task.error);
        } else {
          resolvePromise(task.result);
        }

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(taskTerminated(task, task.error, task.result));

        /**
         * Call final handler with result
         */
        return finalHandler.call(context, task.error, task.result);
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
    onMonitorEvent(taskCreated(task));

    /**
     * Create an instance of the effects resolver where
     * we inject the interpreter recursively, to be able to
     * yield forks and spawns of nested processes / tasks
     */
    const resolveYield = effectsResolver(interpreter, parentContext, io, task);

    /**
     * Create an initial state (defaults to a finished iterator)
     */
    let initialState = { done: true };

    /**
     * Perform the initial step of the iterator
     */
    try {
      initialState = iterator.next();
    } catch (error) {
      task.error = error;
    }

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
        debug(`completing task ${task.type}:${task.id}`);
        /**
         * Set all the task object fields before calling the final handler
         * and returning the resulting task
         */
        if (task.error) {
          /**
           * Cancel all attached forks (recursively)
           */
          task.attachedForks.forEach((childTask) => {
            childTask.cancel();
            task.detachFork(childTask);
          });

          /**
           * Cancel all attached effects
           */
          task.attachedEffects.forEach((effect) => {
            task.detachEffect(effect);
          });
        } else {
          /**
           * Update the result of the task
           */
          task.result = state.value;
        }

        /**
         * Update the task running state
         */
        task.isCompleted = true;

        /**
         * NOTE: Monitor event
         */
        onMonitorEvent(taskCompleted(task));

        /**
         * Check if we should terminate the task
         * (might not be ready if running forks are attached)
         */
        return task.terminateIfReady();
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
         * If the task has been cancelled while an effect wa resolving
         * we'll avoid continuing stepping through the iterator,
         * as the cancellation process has that responsibility now
         */
        if (!task.isRunning) {
          return;
        }

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
        try {
          nextState = nextState || iterator.next(result);
        } catch (err) {
          task.error = err;
          nextState = { done: true };
        }

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
