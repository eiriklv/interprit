/**
 * Helpers
 */
const {
  isEffect,
} = require('./utils');

/**
 * Import effect serializers
 */
const effects = require('./effects');

/**
 * Create a map of the effect serializers
 */
const effectSerializers = Object.keys(effects)
.map((effect) => effects[effect])
.reduce((serializers, describe) => ({
  ...serializers,
  [describe().type]: describe.serialize,
}), {
  default({ type }) {
    console.warn(`Trying to serialize unknown effect of type ${type}`);

    return {
      type: '@@unknown-effect',
    };
  }
});

/**
 * Create a function selector for getting the matching serializer function
 */
const getEffectSerializer = function getEffectSerializer(type) {
  return effectSerializers[type] || effectSerializers.default;
};

/**
 * TODO: Add the appropriate meta-data for all the different effect types
 * and serializations of their arguments to provide more debug/visualization information
 */
const getSerializableTask = module.exports.getSerializableTask = function getSerializableTask(task) {
  return {
    type: task.type,
    id: task.id,
  };
}

/**
 * TODO: Make the result serializable with as much information as possible (for vis/debug)
 */
const getSerializableResult = module.exports.getSerializableResult = function getSerializableResult(result) {
  let transformedResult = {};

  try {
    transformedResult = JSON.parse(JSON.stringify(result));
  } catch (error) {

  }

  return transformedResult;
}

/**
 * TODO: Make the error serializable with as much information as possible (for vis/debug)
 */
const getSerializableError = module.exports.getSerializableError = function getSerializableError(error) {
  let transformedError = {};

  try {
    transformedError = JSON.parse(JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
    }));
  } catch (err) {

  }

  return transformedError;
}

/**
 * Monitor event types
 */
const EFFECT_TRIGGERED = module.exports.EFFECT_TRIGGERED = '@monitor/EFFECT_TRIGGERED';
const EFFECT_RESOLVED = module.exports.EFFECT_RESOLVED = '@monitor/EFFECT_RESOLVED';
const EFFECT_REJECTED = module.exports.EFFECT_REJECTED = '@monitor/EFFECT_REJECTED';
const EFFECT_ATTACHED = module.exports.EFFECT_ATTACHED = '@monitor/EFFECT_ATTACHED';
const EFFECT_DETACHED = module.exports.EFFECT_DETACHED = '@monitor/EFFECT_DETACHED';
const TASK_CREATED = module.exports.TASK_CREATED = '@monitor/TASK_CREATED';
const TASK_COMPLETED = module.exports.TASK_COMPLETED = '@monitor/TASK_COMPLETED';
const TASK_TERMINATED = module.exports.TASK_TERMINATED = '@monitor/TASK_TERMINATED';
const TASK_ATTACHED = module.exports.TASK_ATTACHED = '@monitor/TASK_ATTACHED';
const TASK_DETACHED = module.exports.TASK_DETACHED = '@monitor/TASK_DETACHED';
const TASK_CANCELLED = module.exports.TASK_CANCELLED = '@monitor/TASK_CANCELLED';

/**
 * Monitor event creators
 */
module.exports.effectTriggered = function effectTriggered(effect, parent) {
  return {
    type: EFFECT_TRIGGERED,
    timestamp: Date.now(),
    payload: {
      effect: getEffectSerializer(effect.type)(effect),
      parent: isEffect(parent) ? {
        __type: 'effect',
        ...getEffectSerializer(parent.type)(parent)
      } : {
        __type: 'task',
        ...getSerializableTask(parent)
      },
    },
  };
};

module.exports.effectResolved = function effectResolved(effect, result) {
  return {
    type: EFFECT_RESOLVED,
    timestamp: Date.now(),
    payload: {
      effect: getEffectSerializer(effect.type)(effect),
      result: getSerializableResult(result),
    },
  };
};

module.exports.effectRejected = function effectRejected(effect, reason) {
  return {
    type: EFFECT_REJECTED,
    timestamp: Date.now(),
    payload: {
      effect: getEffectSerializer(effect.type)(effect),
      reason: getSerializableError(reason),
    },
  };
};

module.exports.effectAttached = function effectAttached(effect, task) {
  return {
    type: EFFECT_ATTACHED,
    timestamp: Date.now(),
    payload: {
      effect: getEffectSerializer(effect.type)(effect),
      task: getSerializableTask(task),
    },
  };
};

module.exports.effectDetached = function effectDetached(effect, task) {
  return {
    type: EFFECT_DETACHED,
    timestamp: Date.now(),
    payload: {
      effect: getEffectSerializer(effect.type)(effect),
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskCreated = function taskCreated(task) {
  return {
    type: TASK_CREATED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskCompleted = function taskCompleted(task) {
  return {
    type: TASK_COMPLETED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskTerminated = function taskTerminated(task, error, result) {
  return {
    type: TASK_TERMINATED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTask(task),
      error: getSerializableError(error),
      result: getSerializableResult(result),
    },
  };
};

module.exports.taskAttached = function taskAttached(parentTask, task) {
  return {
    type: TASK_ATTACHED,
    timestamp: Date.now(),
    payload: {
      parentTask: getSerializableTask(parentTask),
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskDetached = function taskDetached(parentTask, task) {
  return {
    type: TASK_DETACHED,
    timestamp: Date.now(),
    payload: {
      parentTask: getSerializableTask(parentTask),
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskCancelled = function taskCancelled(task) {
  return {
    type: TASK_CANCELLED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTask(task),
    },
  };
};
