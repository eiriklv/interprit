/**
 * Helpers
 */
const {
  getSerializableTask,
  getSerializableEffect,
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
const TASK_ATTACHED = module.exports.TASK_ATTACHED = '@monitor/TASK_ATTACHED';
const TASK_DETACHED = module.exports.TASK_DETACHED = '@monitor/TASK_DETACHED';

/**
 * Monitor event creators
 */
module.exports.effectTriggered = function effectTriggered(effect, parent) {
  return {
    type: EFFECT_TRIGGERED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableEffect(effect),
      parent: getSerializableTask(parent),
    },
  };
};

module.exports.effectResolved = function effectResolved(effect, result) {
  return {
    type: EFFECT_RESOLVED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableEffect(effect),
      result,
    },
  };
};

module.exports.effectRejected = function effectRejected(effect, reason) {
  return {
    type: EFFECT_REJECTED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableEffect(effect),
      reason,
    },
  };
};

module.exports.effectAttached = function effectAttached(effect, task) {
  return {
    type: EFFECT_ATTACHED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableEffect(effect),
      task: getSerializableTask(task),
    },
  };
};

module.exports.effectDetached = function effectDetached(effect, task) {
  return {
    type: EFFECT_DETACHED,
    timestamp: Date.now(),
    payload: {
      effect: getSerializableEffect(effect),
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

module.exports.taskCompleted = function taskCompleted(task, error, result) {
  return {
    type: TASK_COMPLETED,
    timestamp: Date.now(),
    payload: {
      task: getSerializableTask(task),
      error,
      result,
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
