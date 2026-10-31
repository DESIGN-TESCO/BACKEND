// Wraps an async route handler so any thrown/rejected error is forwarded to the
// central error middleware instead of crashing the request. Keeps controllers
// free of repetitive try/catch.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
