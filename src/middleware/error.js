// Central error handler. Converts thrown ApiError / Mongoose / JWT errors into
// a consistent JSON shape: { success:false, message, details? }.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';
  let details = err.details;

  // Mongoose validation → 400 with field messages.
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = 'Validation failed.';
  }
  // Bad ObjectId / cast.
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for "${err.path}".`;
  }
  // Duplicate key.
  if (err.code === 11000) {
    status = 409;
    message = 'A record with that value already exists.';
    details = err.keyValue;
  }

  if (status >= 500) {
    console.error('[error]', err.stack || err);
  }
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}

// 404 for unmatched routes.
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
