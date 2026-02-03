"use strict";

/**
 * Wraps an async route handler and forwards any thrown error to Express's
 * error handling middleware instead of causing an unhandled rejection.
 */
function asyncHandler(fn) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
