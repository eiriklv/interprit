const isPromise = module.exports.isPromise = function isPromise(obj) {
  return (
    isObject(obj) &&
    'then' in obj &&
    typeof isFunction(obj.then)
  );
}

const isFunction = module.exports.isFunction = function isFunction(obj) {
  return typeof obj === 'function';
}

const isObject = module.exports.isObject = function isObject(obj) {
  return typeof obj === 'object' && obj instanceof Object;
}

const isSpecObject = module.exports.isSpecObject = function isSpecObject(obj) {
  return (
    isObject(obj) &&
    typeof obj.type === 'string' &&
    !!obj.type
  );
}

const delay = module.exports.delay = function delay(ms, val) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(val);
    }, ms);
  });
}

const once = module.exports.once = function once(func) {
  let called = false;

  return () => {
    if (called) {
      return;
    } else {
      called = true;
      func();
    }
  };
}

const safePromise = module.exports.safePromise = function safePromise(promise) {
  return promise
  .then(result => [null, result])
  .catch(error => [error, null]);
}

const isEffect = module.exports.isEffect = function isEffect(obj) {
  return isSpecObject(obj) && obj.type.includes('@@');
};

/**
 * TODO: Add the appropriate meta-data for all the different effect types
 * and serializations of their arguments to provide more debug/visualization information
 */
const getSerializableTaskOrEffect = module.exports.getSerializableTaskOrEffect = function getSerializableTaskOrEffect(taskOrEffect) {
  return {
    __type: isEffect(taskOrEffect) ? 'effect' : 'task',
    type: taskOrEffect.type,
    id: taskOrEffect.id,
  };
}

/**
 * TODO: Make the result serializable with as much information as possible (for vis/debug)
 */
const getSerializableResult = module.exports.getSerializableResult = function getSerializableResult(result) {
  return result;
}

/**
 * TODO: Make the error serializable with as much information as possible (for vis/debug)
 */
const getSerializableError = module.exports.getSerializableError = function getSerializableError(error) {
  return error;
}
