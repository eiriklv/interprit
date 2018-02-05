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

const getSerializableTask = module.exports.getSerializableTask = function getSerializableTask(task) {
  return {
    id: task.id,
    type: task.type,
  };
}

const getSerializableEffect = module.exports.getSerializableEffect = function getSerializableEffect(effect) {
  return {
    id: effect.id,
    type: effect.type,
  };
}
