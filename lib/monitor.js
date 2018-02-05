module.exports.effectTriggered = function effectTriggered(effect, parent) {
  return {
    type: 'EFFECT_TRIGGERED',
    payload: {
      effect,
      parent,
    },
  };
};

module.exports.effectResolved = function effectResolved(effect, result) {
  return {
    type: 'EFFECT_RESOLVED',
    payload: {
      effect,
      result,
    },
  };
};

module.exports.effectRejected = function effectRejected(effect, reason) {
  return {
    type: 'EFFECT_REJECTED',
    payload: {
      effect,
      reason,
    },
  };
};

module.exports.effectAttached = function effectAttached(effect, task) {
  return {
    type: 'EFFECT_ATTACHED',
    payload: {
      effect,
      task,
    },
  };
};

module.exports.effectDetached = function effectDetached(effect, task) {
  return {
    type: 'EFFECT_DETACHED',
    payload: {
      effect,
      task,
    },
  };
};

module.exports.taskCreated = function taskCreated(task) {
  return {
    type: 'TASK_CREATED',
    payload: {
      task,
    },
  };
};

module.exports.taskCompleted = function taskCompleted(task, result) {
  return {
    type: 'TASK_COMPLETED',
    payload: {
      task,
      result,
    },
  };
};

module.exports.taskAttached = function taskAttached(parentTask, task) {
  return {
    type: 'TASK_ATTACHED',
    payload: {
      parentTask,
      task,
    },
  };
};

module.exports.taskDetached = function taskDetached(parentTask, task) {
  return {
    type: 'TASK_DETACHED',
    payload: {
      parentTask,
      task,
    },
  };
};
