/**
 * Dependencies
 */
const uuid = require('uuid');

/**
 * Helpers
 */
const {
  isSpecObject,
  isPromise,
  isFunction,
  isObject,
  safePromise,
} = require('./utils');

/**
 * Channels
 */
const { eventChannel } = require('./channel');

/**
 * Create an effect creating an action channel
 * that buffers all input actions available for takers
 */
module.exports.actionChannel = function describeActionChannel(typeOrPattern) {
  return {
    type: '@@action-channel',
    id: uuid.v4(),
    typeOrPattern,
  };
};

module.exports.actionChannel.resolve = function resolveActionChannel({ typeOrPattern = '*' }, { subscribe }, engine, parentTask, cb) {
  const chan = eventChannel((emit) => {
    return subscribe(emit, typeOrPattern);
  }, sliding(Infinity));
  parentTask.running && cb(null, chan);
};

module.exports.actionChannel.serialize = function serializeActionChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
    typeOrPattern: effect.typeOrPattern,
  };
};

/**
 * Create an effect bundle for rendering
 * an application to the console (just logging for now)
 *
 * NOTE: This just logs the state at the moment
 * TODO: Make this render a React app / Hyper app into the DOM by passing a render function as "app"
 * TODO: Or make it render to the console by passing a function that writes to process.stdout
 * TODO: The "app" function can be anything
 */
module.exports.render = function describeRender(app, state, commands) {
  return {
    type: '@@render',
    id: uuid.v4(),
    app,
    state,
    commands,
  };
};

module.exports.render.resolve = function resolveRender({ app, state, commands }, io, engine, parentTask, cb) {
  console.log('rendering app:');
  console.log(app(state, commands));
  parentTask.running && cb();
};

module.exports.render.serialize = function serializeRender(effect) {
  return {
    type: effect.type,
    id: effect.id,
    app: effect.app.name,
  };
};

/**
 * Create an effect bundle for forking
 * a generator function / process
 *
 * Handle attached forks of processes
 * and returns a task object
 *
 * NOTE: Starts a new process, attaches the resulting
 * task to the parent task and immediately
 * continues (non-blocking)
 *
 * TODO: Might need more work regarding attaching / detaching
 * (see how redux-saga solves this)
 */
module.exports.fork = function describeFork(proc, ...args) {
  return {
    type: '@@fork',
    id: uuid.v4(),
    proc,
    args,
  };
};

module.exports.fork.resolve = function resolveFork({ proc, args }, io, { interpreter, context }, parentTask, cb) {
  const task = interpreter(proc, context, undefined, ...args);
  parentTask.attachFork(task);
  task.done.then(() => parentTask.detachFork(task));
  parentTask.running && cb(null, task);
};

module.exports.fork.serialize = function serializeFork(effect) {
  return {
    type: effect.type,
    id: effect.id,
    proc: effect.proc.name,
  };
};

/**
 * Create an effect bundle for
 * joining attached forks / tasks
 *
 * Handles attached forks and returns the result
 *
 * Also handles nested cancellation, so that the
 * root task will be cancelled if the joined fork cancels
 */
module.exports.join = function describeJoin(task) {
  return {
    type: '@@join',
    id: uuid.v4(),
    task,
  };
};

module.exports.join.resolve = function resolveJoin({ task }, io, { interpreter, context }, parentTask, cb) {
  task.done
  .then((result) => {
    /**
     * If a joined task is cancelled it should cancel the parent task as well
     */
    if (task.isCancelled() && !parentTask.isCancelled()) {
      parentTask.cancel();
      parentTask.running && cb();
    } else {
      parentTask.running && cb(null, result);
    }
  })
  .catch((error) => {
    parentTask.running && cb(error);
  });
};

module.exports.join.serialize = function serializeJoin(effect) {
  return {
    type: effect.type,
    id: effect.id,
    task: effect.task.id,
  };
};

/**
 * Create an effect bundle for cancelling
 * a generator function / process
 *
 * Cancels the task and returns nothing
 */
module.exports.cancel = function describeCancel(task) {
  return {
    type: '@@cancel',
    id: uuid.v4(),
    task,
  };
};

module.exports.cancel.resolve = function resolveCancel({ task }, io, { interpreter, context }, parentTask, cb) {
  cb(null, task.cancel());
};

module.exports.cancel.serialize = function serializeCancel(effect) {
  return {
    type: effect.type,
    id: effect.id,
    task: effect.task.id,
  };
};

/**
 * Create an effect bundle for checking
 * if a generator function / process was cancelled
 *
 * Returns true/false
 */
module.exports.cancelled = function describeCancelled() {
  return {
    type: '@@cancelled',
    id: uuid.v4(),
  };
};

module.exports.cancelled.resolve = function resolveCancelled({}, io, { interpreter, context }, parentTask, cb) {
  cb(null, parentTask.isCancelled());
};

module.exports.cancelled.serialize = function serializeCancelled(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for spawning
 * a generator function / process
 *
 * Handle detached forks of processes
 * and returns a task object
 *
 * NOTE: Starts a new process and immediately
 * continues (non-blocking)
 *
 * TODO: Work needed regarding attaching / detaching
 * (see how redux-saga does this)
 */
module.exports.spawn = function describeSpawn(proc, ...args) {
  return {
    type: '@@spawn',
    id: uuid.v4(),
    proc,
    args,
  };
};

module.exports.spawn.resolve = function resolveSpawn({ proc, args }, io, { interpreter, context }, parentTask, cb) {
  interpreter(proc, context, undefined, ...args);
  cb();
};

module.exports.spawn.serialize = function serializeSpawn(effect) {
  return {
    type: effect.type,
    id: effect.id,
    proc: effect.proc.name,
  };
};

/**
 * Create an effect bundle for calling
 * a process that might return a value
 *
 * Handle calls of processes
 *
 * NOTE: Waits for the return value of the
 * process before continuing (blocking)
 */
module.exports.callProc = function describeCallProc(proc, ...args) {
  return {
    type: '@@callProc',
    id: uuid.v4(),
    proc,
    args,
  };
};

module.exports.callProc.resolve = function resolveCallProc({ proc, args }, io, { interpreter, context }, parentTask, cb) {
  interpreter(proc, context, (err, result) => {
    parentTask.running && cb(err, result);
  }, ...args);
};

module.exports.callProc.serialize = function serializeCallProc(effect) {
  return {
    type: effect.type,
    id: effect.id,
    proc: effect.proc.name,
  };
};

/**
 * Create promise delay effect bundle
 *
 * Handle an effect spec of the delay type
 */
module.exports.delay = function describeDelay(time, val) {
  return {
    type: '@@delay',
    id: uuid.v4(),
    time,
    val,
  };
};

module.exports.delay.resolve = function resolveDelay({ val, time }, io, engine, parentTask, cb) {
  setTimeout(() => {
    parentTask.running && cb(null, val);
  }, time);
};

module.exports.delay.serialize = function serializeDelay(effect) {
  return {
    type: effect.type,
    id: effect.id,
    time: effect.time,
  };
};

/**
 * NOTE: Higher order effect bundle
 *
 * Create an effect bundle for parallel effects
 *
 * Handle an effect spec of the parallel type
 */
module.exports.parallel = function describeParallel(effects) {
  return {
    type: '@@parallel',
    id: uuid.v4(),
    effects,
  };
};

module.exports.parallel.resolve = function resolveParallel(parentEffect, io, { resolveEffects }, parentTask, cb) {
  const { effects } = parentEffect;

  return Promise.all(effects.map(effect => {
    return new Promise((resolve, reject) => {
      resolveEffects(effect, (err, result) => {
        if (err) {
          return reject(err);
        } else {
          return resolve(result);
        }
      }, parentEffect);
    });
  }))
  .then((result) => parentTask.running && cb(null, result))
  .catch((error) => parentTask.running && cb(error));
};

module.exports.parallel.serialize = function serializeParallel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * NOTE: Higher order effect
 *
 * Create an effect bundle for racing effects
 *
 * Handle an effect spec of the race type
 *
 * NOTE: This supports both arrays and dictionaries as effects
 * - Array => [effectOne, effectTwo, ...]
 * - Dictionary =>  { effectsOne: effect, effectTwo: effect, ...}
 */
module.exports.race = function describeRace(effects) {
  return {
    type: '@@race',
    id: uuid.v4(),
    effects,
  };
};

module.exports.race.resolve = function resolveRace(parentEffect, io, { resolveEffects }, parentTask, cb) {
  const { effects } = parentEffect;

  /**
   * Check if the effects are represented by a dictionary or an array
   */
  const isDictionary = (
    typeof effects === 'object' &&
    !Array.isArray(effects)
  );

  /**
   * Handle dictionary effects
   */
  if (isDictionary) {
    /**
     * Get all the effect labels
     */
    const labels = Object.keys(effects);

    /**
     * Resolve the effects recursively
     */
    return Promise.race(labels.map((label) => {
      return new Promise((resolve, reject) => {
        resolveEffects(effects[label], (err, result) => {
          if (err) {
            return reject(err);
          } else {
            return resolve({ [label]: result });
          }
        }, parentEffect);
      });
    }))
    .then((result) => parentTask.running && cb(null, result))
    .catch((error) => parentTask.running && cb(error));
  }

  /**
   * Handle array effects
   */
  return Promise.race(effects.map(effect => {
    return new Promise((resolve, reject) => {
      resolveEffects(effect, (err, result) => {
        if (err) {
          return reject(err);
        } else {
          return resolve(result);
        }
      }, parentEffect);
    });
  }))
  .then((result) => parentTask.running && cb(null, result))
  .catch((error) => parentTask.running && cb(error));
};

module.exports.race.serialize = function serializeRace(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for calling
 * a function that returns a promise
 * or a value and might have side effects
 *
 * Handle an effect spec of the call type
 * which resolves both synchronous function
 * calls and function calls that returns a promise
 */
module.exports.call = function describeCall(func, ...args) {
  return {
    type: '@@call',
    id: uuid.v4(),
    func,
    args,
  };
};

module.exports.call.resolve = function resolveCall({ func, args }, io, engine, parentTask, cb) {
  let result;
  let error;

  try {
    result = func(...args);
  } catch (e) {
    error = e;
  }

  return (error ? Promise.reject(error) : Promise.resolve(result))
  .then((res) => parentTask.running && cb(null, res))
  .catch((err) => parentTask.running && cb(err));
};

module.exports.call.serialize = function serializeCall(effect) {
  return {
    type: effect.type,
    id: effect.id,
    func: effect.func.name,
  };
};

/**
 * Create an effect bundle for applying
 * a function that returns a promise
 * or a value and might have side effects
 *
 * Handle an effect spec of the apply type
 * which resolves both synchronous function
 * applications and function applications that returns a promise
 */
module.exports.apply = function describeApply(ctx, func, ...args) {
  return {
    type: '@@apply',
    id: uuid.v4(),
    ctx,
    func,
    args,
  };
};

module.exports.apply.resolve = function resolveApply({ ctx, func, args }, io, engine, parentTask, cb) {
  let result;
  let error;

  try {
    result = func.apply(ctx, args);
  } catch (e) {
    error = e;
  }

  return (error ? Promise.reject(error) : Promise.resolve(result))
  .then((res) => parentTask.running && cb(null, res))
  .catch((err) => parentTask.running && cb(err));
};

module.exports.apply.serialize = function serializeApply(effect) {
  return {
    type: effect.type,
    id: effect.id,
    func: effect.func.name,
  };
};

/**
 * Create an effect bundle for calling
 * a function that returns a promise
 * or a value and might have side effects
 *
 * NOTE: This will return a tuple containing
 * a possible error instead of throwing
 *
 * Handle an effect spec of the safe-call type
 * which resolves both synchronous function
 * calls and function calls that returns a promise
 *
 * NOTE: This will return a "tuple" (array of the form [error, result])
 * containing a possible error instead of throwing
 */
module.exports.safeCall = function describeSafeCall(func, ...args) {
    return {
      type: '@@safeCall',
      func,
      args,
    };
  };

module.exports.safeCall.resolve = function resolveSafeCall({ func, args }, io, engine, parentTask, cb) {
  let result;
  let error;

  try {
    result = func(...args);
  } catch (e) {
    error = e;
  }

  return safePromise(error ? Promise.reject(error) : Promise.resolve(result))
  .then(([err, res]) => parentTask.running && cb(null, [err, res]));
};

module.exports.safeCall.serialize = function serializeSafeCall(effect) {
  return {
    type: effect.type,
    id: effect.id,
    func: effect.func.name,
  };
};

/**
 * Create an effect bundle for applying
 * a function that returns a promise
 * or a value and might have side effects
 *
 * NOTE: This will return a tuple containing
 * a possible error instead of throwing
 *
 * Handle an effect spec of the safe-apply type
 * which resolves both synchronous function
 * applications and function applications that returns a promise
 *
 * NOTE: This will return a "tuple" (array of the form [error, result])
 * containing a possible error instead of throwing
 */
module.exports.safeApply = function describeSafeApply(ctx, func, ...args) {
    return {
      type: '@@safeApply',
      ctx,
      func,
      args,
    };
  };

module.exports.safeApply.resolve = function resolveSafeApply({ ctx, func, args }, io, engine, parentTask, cb) {
  let result;
  let error;

  try {
    result = func.apply(ctx, args);
  } catch (e) {
    error = e;
  }

  return safePromise(error ? Promise.reject(error) : Promise.resolve(result))
  .then(([err, res]) => parentTask.running && cb(null, [err, res]));
};

module.exports.safeApply.serialize = function serializeSafeApply(effect) {
  return {
    type: effect.type,
    id: effect.id,
    func: effect.func.name,
  };
};

/**
 * Create an effect bundle for calling
 * a node callback / continuation passing
 * style function
 *
 * Handle an effect spec of the call type
 * which resolves both synchronous function
 * calls and function calls that returns a promise
 */
module.exports.cps = function describeCps(func, ...args) {
  return {
    type: '@@cps',
    id: uuid.v4(),
    func,
    args,
  };
};

module.exports.cps.resolve = function resolveCps({ func, args }, io, engine, parentTask, cb) {
  return func(...args, parentTask, (err, result) => {
    parentTask.running && cb(err, result);
  });
};

module.exports.cps.serialize = function serializeCps(effect) {
  return {
    type: effect.type,
    id: effect.id,
    func: effect.func.name,
  };
};

/**
 * Create an effect bundle for putting
 * an action into the chain for processing
 *
 * Handle an effect spec of the put-stream
 * type which resolves putting a value on a stream
 */
module.exports.putStream = function describePutStream(stream, data) {
  return {
    type: '@@putStream',
    id: uuid.v4(),
    stream,
    data,
  };
};

module.exports.putStream.resolve = function resolvePutStream({ stream, data }, io, engine, parentTask, cb) {
  stream.write(data);
  parentTask.running && cb(null);
};

module.exports.putStream.serialize = function serializePutStream(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for taking
 * an action from the chain
 *
 * Handle an effect spec of the take-stream
 * type which resolves taking a value from a stream
 */
module.exports.takeStream = function describeTakeStream(stream) {
  return {
    type: '@@takeStream',
    id: uuid.v4(),
    stream,
  };
};

module.exports.takeStream.resolve = function resolveTakeStream({ stream }, io, engine, parentTask, cb) {
  const listener = (data) => {
    stream.removeListener('data', listener);
    parentTask.running && cb(null, data);
  }
  stream.on('data', listener);
};

module.exports.takeStream.serialize = function serializeTakeStream(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for taking
 * an action from the chain
 *
 * Handle an effect spec of the take-event
 * type which resolves taking an event from
 * an event emitter
 */
module.exports.takeEvent = function describeTakeEvent(emitter, event) {
  return {
    type: '@@takeEvent',
    id: uuid.v4(),
    emitter,
    event,
  };
};

module.exports.takeEvent.resolve = function resolveTakeEvent({ emitter, event, data }, io, engine, parentTask, cb) {
  const listener = (data) => {
    emitter.removeListener(event, listener);
    parentTask.running && cb(null, data);
  }
  emitter.on(event, listener);
};

module.exports.takeEvent.serialize = function serializeTakeEvent(effect) {
  return {
    type: effect.type,
    id: effect.id,
    event: effect.event,
  };
};

/**
 * Create an effect bundle for putting
 * an action into the chain for processing
 *
 * Handle an effect spec of the put-event
 * type which resolves putting an event
 * on an event emitter
 */
module.exports.putEvent = function describePutEvent(emitter, event, data) {
  return {
    type: '@@putEvent',
    id: uuid.v4(),
    emitter,
    event,
    data,
  };
};

module.exports.putEvent.resolve = function resolvePutEvent({ emitter, event, data }, io, engine, parentTask, cb) {
  emitter.emit(event, data);
  parentTask.running && cb(null);
};

module.exports.putEvent.serialize = function serializePutEvent(effect) {
  return {
    type: effect.type,
    id: effect.id,
    event: effect.event,
  };
};

/**
 * Create an effect bundle for selecting
 * something from the store state
 * using a selector function
 *
 * Handle an effect spec of the select
 * type which resolves selecting state
 * from the io
 */
module.exports.select = function describeSelect(selector) {
  return {
    type: '@@select',
    id: uuid.v4(),
    selector,
  };
};

module.exports.select.resolve = function resolveSelect({
  selector = (state) => state,
}, {
  getState = () => { console.log('No IO for getState present') },
}, engine, parentTask, cb) {
  parentTask.running && cb(null, selector(getState()));
};

module.exports.select.serialize = function serializeSelect(effect) {
  return {
    type: effect.type,
    id: effect.id,
    selector: effect.selector.name,
  };
};

/**
 * Create an effect bundle for taking
 * an action from the system based
 * on a type or a pattern
 *
 * Handle an effect spec of the take-action
 * type which resolves taking actions from
 * the io system
 */
module.exports.take = function describeTake(typeOrPattern) {
  return {
    type: '@@take',
    id: uuid.v4(),
    typeOrPattern,
  };
};

module.exports.take.resolve = function resolveTake({ typeOrPattern = '*' }, { subscribe }, engine, parentTask, cb) {
  const unsubscribe = subscribe((action = {}) => {
    const { type = '' } = action;
    unsubscribe();
    parentTask.running && cb(null, action);
  }, typeOrPattern);
};

module.exports.take.serialize = function serializeTake(effect) {
  return {
    type: effect.type,
    id: effect.id,
    typeOrPattern: effect.typeOrPattern
  };
};

/**
 * Create an effect bundle for putting
 * an action into the system
 *
 * Handle an effect spec of the put-action
 * type which resolves dispatching actions
 * into the io system
 */
module.exports.put = function describePut(action) {
  return {
    type: '@@put',
    id: uuid.v4(),
    action,
  };
};

module.exports.put.resolve = function resolvePut({ action }, { dispatch }, engine, parentTask, cb) {
  parentTask.running && cb(null, dispatch(action));
};

module.exports.put.serialize = function serializePut(effect) {
  return {
    type: effect.type,
    id: effect.id,
    action: effect.action.type,
  };
};

/**
 * Create an effect bundle for putting
 * a message into a channel
 *
 * Handle an effect spec of the put-channel
 * type which resolves putting messages into channels
 */
module.exports.putChannel = function describePutChannel(channel, message) {
  return {
    type: '@@putChannel',
    id: uuid.v4(),
    channel,
    message,
  };
};

module.exports.putChannel.resolve = function resolvePutChannel({ channel, message }, io, engine, parentTask, cb) {
  channel.put(message);
  parentTask.running && cb();
};

module.exports.putChannel.serialize = function serializePutChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for taking
 * a message from a channel
 *
 * Handle an effect spec of the take-channel
 * type which resolves taking messages from channels
 */
module.exports.takeChannel = function describeTakeChannel(channel) {
  return {
    type: '@@takeChannel',
    id: uuid.v4(),
    channel,
  };
};

module.exports.takeChannel.resolve = function resolveTakeChannel({ channel }, io, engine, parentTask, cb) {
  channel.take((msg) => {
    parentTask.running && cb(null, msg);
  });
};

module.exports.takeChannel.serialize = function serializeTakeChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for
 * flushing a channel
 *
 * Handle an effect spec of the flush-channel
 * type which resolves flushing messages from channels
 */
module.exports.flushChannel = function describeFlushChannel(channel) {
  return {
    type: '@@flushChannel',
    id: uuid.v4(),
    channel,
  };
};

module.exports.flushChannel.resolve = function resolveFlushChannel({ channel }, io, engine, parentTask, cb) {
  channel.flush((messages) => {
    parentTask.running && cb(null, messages);
  });
};

module.exports.flushChannel.serialize = function serializeFlushChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for putting
 * a message into a synchronous channel
 *
 * Handle an effect spec of the put-sync-channel
 * type which resolves putting messages into channels
 */
module.exports.putSyncChannel = function describePutSyncChannel(channel, message) {
  return {
    type: '@@putSyncChannel',
    id: uuid.v4(),
    channel,
    message,
  };
};

module.exports.putSyncChannel.resolve = function resolvePutSyncChannel({ channel, message }, io, engine, parentTask, cb) {
  channel.put(message, (msg) => {
    parentTask.running && cb(null, msg)
  });
};

module.exports.putSyncChannel.serialize = function serializePutSyncChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for taking
 * a message from a sync channel
 *
 * Handle an effect spec of the take-sync-channel
 * type which resolves taking messages from synchronous channels
 */
module.exports.takeSyncChannel = function describeTakeSyncChannel(channel) {
  return {
    type: '@@takeSyncChannel',
    id: uuid.v4(),
    channel,
  };
};

module.exports.takeSyncChannel.resolve = function resolveTakeSyncChannel({ channel }, io, engine, parentTask, cb) {
  channel.take((msg) => {
    parentTask.running && cb(null, msg);
  });
};

module.exports.takeSyncChannel.serialize = function serializeTakeSyncChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for
 * flushing a synchronous channel
 *
 * Handle an effect spec of the flush-sync-channel
 * type which resolves flushing messages from synchronous channels
 */
module.exports.flushSyncChannel = function describeFlushSyncChannel(channel) {
  return {
    type: '@@flushSyncChannel',
    id: uuid.v4(),
    channel,
  };
};

module.exports.flushSyncChannel.resolve = function resolveFlushSyncChannel({ channel }, io, engine, parentTask, cb) {
  channel.flush((messages) => {
    parentTask.running && cb(null, messages);
  });
};

module.exports.flushSyncChannel.serialize = function serializeFlushSyncChannel(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for getting the shared global context
 *
 * Handle an effect spec of the get-context
 * type which resolves getting the shared context
 */
module.exports.getGlobalContext = function describeGetGlobalContext() {
  return {
    type: '@@getGlobalContext',
    id: uuid.v4(),
  };
};

module.exports.getGlobalContext.resolve = function resolveGetGlobalContext(effect, io, { context }, parentTask, cb) {
  parentTask.running && cb(null, context);
};

module.exports.getGlobalContext.serialize = function serializeGetGlobalContext(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for setting something on the shared global context
 *
 * Handle an effect spec of the set-context
 * type which resolves setting something on the shared context
 */
module.exports.setGlobalContext = function describeSetGlobalContext(update) {
  return {
    type: '@@setGlobalContext',
    id: uuid.v4(),
    update,
  };
};

module.exports.setGlobalContext.resolve = function resolveSetGlobalContext({ update }, io, { context }, parentTask, cb) {
  Object.assign(context, update);
  parentTask.running && cb();
};

module.exports.setGlobalContext.serialize = function serializeSetGlobalContext(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for getting the shared local context
 *
 * Handle an effect spec of the get-context
 * type which resolves getting the shared context
 */
module.exports.getLocalContext = function describeGetLocalContext() {
  return {
    type: '@@getLocalContext',
    id: uuid.v4(),
  };
};

module.exports.getLocalContext.resolve = function resolveGetLocalContext(effect, io, engine, { context }, cb) {
  parentTask.running && cb(null, context);
};

module.exports.getLocalContext.serialize = function serializeGetLocalContext(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};

/**
 * Create an effect bundle for setting something on the shared local context
 *
 * Handle an effect spec of the set-context
 * type which resolves setting something on the shared context
 */
module.exports.setLocalContext = function describeSetLocalContext(update) {
  return {
    type: '@@setLocalContext',
    id: uuid.v4(),
    update,
  };
};

module.exports.setLocalContext.resolve = function resolveSetLocalContext({ update }, io, engine, { context }, cb) {
  Object.assign(context, update);
  parentTask.running && cb();
};

module.exports.setLocalContext.serialize = function serializeSetLocalContext(effect) {
  return {
    type: effect.type,
    id: effect.id,
  };
};
