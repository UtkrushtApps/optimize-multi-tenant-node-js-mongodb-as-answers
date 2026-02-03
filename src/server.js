"use strict";

const http = require("http");
const createApp = require("./app");
const { connectToDatabase } = require("./db/mongoose");

/**
 * Bootstraps the API server and connects to MongoDB.
 */
async function start() {
  await connectToDatabase();

  const app = createApp();

  const port = parseInt(process.env.PORT, 10) || 3000;
  const server = http.createServer(app);

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${port}`);
  });

  return server;
}

// Start only when executed directly (not when imported in tests)
if (require.main === module) {
  // eslint-disable-next-line no-console
  start().catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });
}

module.exports = start;
