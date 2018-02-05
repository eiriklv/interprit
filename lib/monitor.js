/**
 * Helpers
 */
const {
  getSerializableTask,
  getSerializableEffect,
} = require('./utils');

module.exports.effectTriggered = function effectTriggered(effect, parent) {
  return {
    type: 'EFFECT_TRIGGERED',
    payload: {
      effect: getSerializableEffect(effect),
      parent: getSerializableTask(parent),
    },
  };
};

module.exports.effectResolved = function effectResolved(effect, result) {
  return {
    type: 'EFFECT_RESOLVED',
    payload: {
      effect: getSerializableEffect(effect),
      result,
    },
  };
};

module.exports.effectRejected = function effectRejected(effect, reason) {
  return {
    type: 'EFFECT_REJECTED',
    payload: {
      effect: getSerializableEffect(effect),
      reason,
    },
  };
};

module.exports.effectAttached = function effectAttached(effect, task) {
  return {
    type: 'EFFECT_ATTACHED',
    payload: {
      effect: getSerializableEffect(effect),
      task: getSerializableTask(task),
    },
  };
};

module.exports.effectDetached = function effectDetached(effect, task) {
  return {
    type: 'EFFECT_DETACHED',
    payload: {
      effect: getSerializableEffect(effect),
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskCreated = function taskCreated(task) {
  return {
    type: 'TASK_CREATED',
    payload: {
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskCompleted = function taskCompleted(task, result) {
  return {
    type: 'TASK_COMPLETED',
    payload: {
      task: getSerializableTask(task),
      result,
    },
  };
};

module.exports.taskAttached = function taskAttached(parentTask, task) {
  return {
    type: 'TASK_ATTACHED',
    payload: {
      parentTask: getSerializableTask(parentTask),
      task: getSerializableTask(task),
    },
  };
};

module.exports.taskDetached = function taskDetached(parentTask, task) {
  return {
    type: 'TASK_DETACHED',
    payload: {
      parentTask: getSerializableTask(parentTask),
      task: getSerializableTask(task),
    },
  };
};
