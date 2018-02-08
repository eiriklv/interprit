/**
 * Import effect primitives
 */
const { fork, take, cancel } = require('./effects');

module.exports.takeEvery = function takeEvery(pattern, proc, ...args) {
  return fork(function* () {
    while (true) {
      const action = yield take(pattern);
      yield fork(proc, ...args.concat(action));
    }
  });
}

module.exports.takeLatest = function takeLatest(pattern, proc, ...args) {
  return fork(function* () {
    let lastTask;

    while (true) {
      const action = yield take(pattern);

      if (lastTask) {
        yield cancel(lastTask);
      }

      lastTask = yield fork(proc, ...args.concat(action));
    }
  });
}
