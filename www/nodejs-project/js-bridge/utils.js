const deasync = require('deasync');

function generateRandomID(length = 20) {
  return String(
    Math.random()
      .toString()
      .substring(2, length + 2)
  );
}

function isRawObject(item) {
  if (item === null || typeof item !== "object") return false;
  return item.constructor?.name == "Object";
}

function promiseToSync(promise) {
  return (...args) => {
    return deasync(cb => {
      promise(...args)
        .then(res => cb(res))
        .catch(err => cb(err, null));
    })();
  }
}

function evaluatePromiseSync(promise) {
  return deasync(cb => {
    promise.then(res => cb(null, res)).catch(cb);
  })();
}

module.exports = {
  isRawObject,
  promiseToSync,
  generateRandomID,
  evaluatePromiseSync
}
