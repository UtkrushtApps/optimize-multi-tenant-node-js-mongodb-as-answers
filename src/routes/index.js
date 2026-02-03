"use strict";

const express = require("express");
const tenantContext = require("../middleware/tenantContext");
const assessmentsRouter = require("./assessments");
const submissionsRouter = require("./submissions");

const router = express.Router();

// Health check endpoint (non‑tenant scoped)
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// All tenant‑scoped routes share the same prefix and tenant context middleware
router.use("/tenants/:tenantId", tenantContext, (req, res, next) => {
  // Mount nested routers that rely on mergeParams: true
  assessmentsRouter(req, res, (err) => {
    if (err) return next(err);
    submissionsRouter(req, res, next);
  });
});

module.exports = router;
