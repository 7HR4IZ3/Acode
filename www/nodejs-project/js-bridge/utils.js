const deasync = null// require('deasync');

function generateRandomID(length = 20) {
  return String(
    Math.random()
      .toString()
      .substring(2, length + 2)
  );
}

function isRawObject(item) {
  if (item === null || typeof item !== "object") return false;
  return item instanceof Object && item.constructor == Object().constructor;
}

function promiseToSync(promise) {
  return (...args) => {
    return deasync(cb => {
      promise(...args)
        .then(res => cb(null, res))
        .catch(err => cb(err, null));
    })();
  }
}

function evaluatePromiseSync(promise) {
  return deasync(cb => {
    promise.then(
      res => cb(null, res),
      err => cb(err, null)
    );
  })();
}

module.exports = {
  isRawObject,
  promiseToSync,
  generateRandomID,
  evaluatePromiseSync
}
