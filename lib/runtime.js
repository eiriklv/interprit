/**
 * Helpers
 */
const { isSpecObject } = require('../utils');

/**
 * Create a resolver than will resolve the
 * yields of effect descriptions
 */
function createEffectsResolver(effects) {
  /**
   * Return a function that where the runtime
   * can inject a reference to itself and the
   * context to be able to call itself recursively
   */
  return function(runtime, context, io) {
    /**
     * Return the actual effects resolver
     * that will be used to resolve effects
     */
    return function resolveEffects(
      effect = {},
      cb = () => { console.warn('No callback passed for resolving effect') }
    ) {
      /**
       * Make sure we only resolve valid effect descriptions
       */
      if (!isSpecObject(effect)) {
        return cb(new Error('You can only yield effects as object descriptions'));
      }

      /**
       * Create a bundle of the engine itself (for recursive application)
       */
      const engine = { resolveEffects, runtime, context };

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
      .reduce((result, { describe, resolve }) => Object.assign({}, result, {
        [describe().type]: resolve,
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
      return resolve(effect, io, engine, cb);
    }
  }
}

/**
 * Create a middleware application function
 */
function createMiddlewareApplicator(middlewares = []) {
  return function(effect) {
    return middlewares.reduce(function(result, middleware) {
      return middleware(effect);
    }, effect);
  };
}

/**
 * The runtime responsible
 * of running / stepping through
 * our program, and to handle all yields
 *
 * Our very basic runtime just handles
 * all yields by returning the yielded value
 */
function createRuntime(
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
   * Return a runtime / runner function
   * that will automatically run all the
   * middlewares before running the program
   */
  return function runtime(
    program = function* () {},
    context = {},
    finalHandler = function () {},
    ...args
  ) {
    /**
     * Create an instance of the effects resolver where
     * we inject the runtime recursively, to be able to
     * yield forks and spawns of nested processes
     */
    const resolveYield = effectsResolver(runtime, context, io);

    /**
     * Create a collection holding both
     * the middlewares and the program
     */
    const programs = [...middleware, program];

    /**
     * Create an iterator from the program generator
     */
    const iterator = program.call(context, ...args);

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
      resolveYield(applyMiddleware(state.value), function (err, result) {
        if (err) {
          return iterator.throw(err);
        }

        /**
         * Yield back to the generator / process
         * with the resolved effect / value
         */
        const nextState = iterator.next(result);

        /**
         * Continue stepping through the flow and resolving
         * yield, or if done we'll call the final handler with
         * the context and final result / return
         */
        return !nextState.done ?
        resolveYieldRecursively(nextState) :
        finalHandler.call(context, null, nextState.value)
      });
    }

    /**
     * Start stepping through the program(s)
     */
    resolveYieldRecursively(initialState);
  }
}

module.exports = createRuntime;
