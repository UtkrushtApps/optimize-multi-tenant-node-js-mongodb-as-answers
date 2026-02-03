# Solution Steps

1. Set up the MongoDB connection helper using Mongoose so the API can reuse a single pooled connection and read the URI from the MONGO_URI environment variable (see src/db/mongoose.js).

2. Define the Assessment Mongoose model with tenantId, name, status, tags, metadata, and timestamps, then add compound indexes on (tenantId, createdAt), (tenantId, status, createdAt), and (tenantId, name) to match common listing and search patterns (see src/models/Assessment.js).

3. Define the Submission Mongoose model with tenantId, assessmentId, candidateId, status, score, submittedAt, durationSeconds, and responses, then add compound indexes on (tenantId, assessmentId, submittedAt), (tenantId, candidateId, submittedAt), (tenantId, status, submittedAt), and (tenantId, assessmentId, score) to support high‑volume listing and reporting (see src/models/Submission.js).

4. Create a reusable asyncHandler middleware that wraps async route handlers and forwards rejected promises to Express’s error handler instead of causing unhandled rejections (see src/middleware/asyncHandler.js).

5. Implement a centralized errorHandler middleware that logs errors, maps common error types (validation, cast errors, custom errors) to HTTP status codes, and returns a safe JSON error payload without leaking stack traces in production (see src/middleware/errorHandler.js).

6. Implement tenantContext middleware that extracts tenantId from the :tenantId route parameter or x-tenant-id header, validates it, attaches it to req.tenantId, and rejects the request with 400 if it is missing; this guarantees all downstream handlers are properly tenant‑scoped (see src/middleware/tenantContext.js).

7. In assessmentController, implement listAssessments to: build a filter scoped by tenantId with optional status and name prefix search, validate and cap page/limit params, restrict sortBy to indexed fields (createdAt or name), use .lean() with a minimal projection, and run find and countDocuments in parallel for efficient paginated listings (see src/controllers/assessmentController.js).

8. In assessmentController, implement getAssessmentById to fetch a single assessment for the given tenant using findOne scoped by tenantId, selecting only needed fields, using lean(), and returning 404 if not found (see src/controllers/assessmentController.js).

9. In submissionController, implement createSubmission to validate assessmentId and candidateId, create a new Submission document scoped by tenantId, set submittedAt to now if missing, and return the created submission (see src/controllers/submissionController.js).

10. In submissionController, implement listSubmissions to support tenant‑wide listing with filters (assessmentId, candidateId, status, from/to submittedAt dates), validate IDs, build an index‑friendly filter, sort by submittedAt desc, project only light fields (exclude responses), use lean(), and paginate while counting documents in parallel (see src/controllers/submissionController.js).

11. In submissionController, implement listSubmissionsForAssessment to list submissions for a specific assessment and tenant, validating assessmentId, using the (tenantId, assessmentId, submittedAt) index with sort by submittedAt desc, projecting only lightweight fields, and paginating with countDocuments in parallel (see src/controllers/submissionController.js).

12. In reportController, implement getAssessmentSummary as an aggregation pipeline: $match on (tenantId, assessmentId), $group by (assessmentId, status) to get per‑status counts and score stats, regroup by assessmentId to compute totalSubmissions and global avg/min/max scores and build a statusCounts array, then project a compact summary document; return a zeroed summary if no submissions exist (see src/controllers/reportController.js).

13. In reportController, implement getAssessmentDailyActivity as an aggregation: build a match object with tenantId, assessmentId, and optional submittedAt range, $group by year/month/day to count submissions per day, sort by date, and project { date, count } buckets to power a chart, all executed inside MongoDB for performance (see src/controllers/reportController.js).

14. Create the assessments router with mergeParams: true and define routes under /tenants/:tenantId/assessments for listing assessments, getting an assessment by id, listing submissions for an assessment, and obtaining summary and daily activity reports; wrap handlers with asyncHandler (see src/routes/assessments.js).

15. Create the submissions router with mergeParams: true and define tenant‑scoped routes /tenants/:tenantId/submissions for creating a submission (POST) and listing submissions (GET), again wrapping handlers with asyncHandler (see src/routes/submissions.js).

16. Create the main router that exposes /health for health checks and mounts all tenant‑scoped routes under /tenants/:tenantId with the tenantContext middleware; delegate to the assessments and submissions routers, which rely on mergeParams to access tenantId (see src/routes/index.js).

17. Initialize the Express app in app.js: configure JSON body parsing with a reasonable size limit, mount the main router under /api, add a simple 404 handler for unknown routes, and finally register the centralized errorHandler as the last middleware (see src/app.js).

18. Bootstrap the HTTP server in server.js: connect to MongoDB using connectToDatabase, create the app with createApp, listen on PORT or 3000, and only start automatically when server.js is executed directly, exporting the start function for tests or tooling (see src/server.js).

