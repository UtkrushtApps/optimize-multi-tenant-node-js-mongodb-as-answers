"use strict";

const mongoose = require("mongoose");

/**
 * MongoDB connection helper using Mongoose.
 *
 * Connection string is taken from MONGO_URI env var or defaults to a local
 * MongoDB instance for development.
 */
async function connectToDatabase() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/utkrusht-multitenant";

  // Avoid multiple connections when used in tests or serverless setups
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });

  // Basic logging; in a real system you'd use a proper logger
  mongoose.connection.on("connected", () => {
    // eslint-disable-next-line no-console
    console.log("MongoDB connected");
  });

  mongoose.connection.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error", err);
  });

  return mongoose.connection;
}

module.exports = {
  connectToDatabase,
};
