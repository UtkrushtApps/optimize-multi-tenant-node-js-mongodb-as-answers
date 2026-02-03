"use strict";

/**
 * Centralized error handling middleware.
 *
 * Converts known error types into consistent JSON responses and ensures we
 * never leak stack traces or internal details to clients in production.
 */
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const isProd = process.env.NODE_ENV === "production";

  // Map common error types to HTTP status codes
  let status = 500;
  let code = "internal_error";
  let message = "An unexpected error occurred";

  if (err.name === "ValidationError") {
    status = 400;
    code = "validation_error";
    message = err.message;
  } else if (err.name === "CastError") {
    status = 400;
    code = "invalid_id";
    message = `Invalid value for ${err.path}`;
  } else if (err.status && err.message) {
    status = err.status;
    code = err.code || code;
    message = err.message;
  }

  const payload = {
    error: {
      code,
      message,
    },
  };

  if (!isProd) {
    payload.error.details = err.stack || String(err);
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
