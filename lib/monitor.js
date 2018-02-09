/**
 * Helpers
 */
const {
  getSerializableTaskOrEffect,
  getSerializableResult,
  getSerializableError,
} = require('./utils');

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
      effect: getSerializableTaskOrEffect(effect),
      parent: getSerializableTaskOrEffect(parent),
    },
  };
};

module.exports.effectResolved = function effectResolved(effect, result) {
  return {
    type: EFFECT_RESOLVED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableTaskOrEffect(effect),
      result: getSerializableResult(result),
    },
  };
};

module.exports.effectRejected = function effectRejected(effect, reason) {
  return {
    type: EFFECT_REJECTED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableTaskOrEffect(effect),
      reason: getSerializableError(reason),
    },
  };
};

module.exports.effectAttached = function effectAttached(effect, task) {
  return {
    type: EFFECT_ATTACHED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableTaskOrEffect(effect),
      task: getSerializableTaskOrEffect(task),
    },
  };
};

module.exports.effectDetached = function effectDetached(effect, task) {
  return {
    type: EFFECT_DETACHED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableTaskOrEffect(effect),
      task: getSerializableTaskOrEffect(task),
    },
  };
};

module.exports.taskCreated = function taskCreated(task) {
  return {
    type: TASK_CREATED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTaskOrEffect(task),
    },
  };
};

module.exports.taskCompleted = function taskCompleted(task) {
  return {
    type: TASK_COMPLETED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTaskOrEffect(task),
    },
  };
};

module.exports.taskTerminated = function taskTerminated(task, error, result) {
  return {
    type: TASK_TERMINATED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTaskOrEffect(task),
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
      parentTask: getSerializableTaskOrEffect(parentTask),
      task: getSerializableTaskOrEffect(task),
    },
  };
};

module.exports.taskDetached = function taskDetached(parentTask, task) {
  return {
    type: TASK_DETACHED,
    timestamp: Date.now(),
    payload: {
      parentTask: getSerializableTaskOrEffect(parentTask),
      task: getSerializableTaskOrEffect(task),
    },
  };
};

module.exports.taskCancelled = function taskCancelled(task) {
  return {
    type: TASK_CANCELLED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTaskOrEffect(task),
    },
  };
};
