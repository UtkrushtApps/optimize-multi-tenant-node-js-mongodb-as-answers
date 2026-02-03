"use strict";

const express = require("express");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

/**
 * Creates and configures the Express application.
 */
function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));

  // Mount main router
  app.use("/api", routes);

  // 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: "not_found",
        message: "Route not found",
      },
    });
  });

  // Central error handler should be last
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
