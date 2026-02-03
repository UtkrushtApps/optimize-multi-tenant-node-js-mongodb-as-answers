"use strict";

const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const submissionController = require("../controllers/submissionController");

const router = express.Router({ mergeParams: true });

// POST /tenants/:tenantId/submissions
router.post("/", asyncHandler(submissionController.createSubmission));

// GET /tenants/:tenantId/submissions
router.get("/", asyncHandler(submissionController.listSubmissions));

module.exports = router;
