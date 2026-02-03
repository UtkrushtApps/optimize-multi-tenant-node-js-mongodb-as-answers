"use strict";

const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const assessmentController = require("../controllers/assessmentController");
const submissionController = require("../controllers/submissionController");
const reportController = require("../controllers/reportController");

const router = express.Router({ mergeParams: true });

// GET /tenants/:tenantId/assessments
router.get("/", asyncHandler(assessmentController.listAssessments));

// GET /tenants/:tenantId/assessments/:assessmentId
router.get("/:assessmentId", asyncHandler(assessmentController.getAssessmentById));

// GET /tenants/:tenantId/assessments/:assessmentId/submissions
router.get(
  "/:assessmentId/submissions",
  asyncHandler(submissionController.listSubmissionsForAssessment)
);

// Reporting endpoints under assessment resource
// GET /tenants/:tenantId/assessments/:assessmentId/summary
router.get(
  "/:assessmentId/summary",
  asyncHandler(reportController.getAssessmentSummary)
);

// GET /tenants/:tenantId/assessments/:assessmentId/daily-activity
router.get(
  "/:assessmentId/daily-activity",
  asyncHandler(reportController.getAssessmentDailyActivity)
);

module.exports = router;
