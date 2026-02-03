"use strict";

const mongoose = require("mongoose");
const Submission = require("../models/Submission");

/**
 * Create a new submission for an assessment.
 *
 * This is not usually the main performance hotspot, but we still validate
 * inputs and keep the document size reasonable.
 */
async function createSubmission(req, res) {
  const tenantId = req.tenantId;
  const {
    assessmentId,
    candidateId,
    status,
    score,
    submittedAt,
    durationSeconds,
    responses,
  } = req.body || {};

  if (!assessmentId || !mongoose.Types.ObjectId.isValid(assessmentId)) {
    return res.status(400).json({
      error: {
        code: "invalid_input",
        message: "A valid assessmentId must be provided",
      },
    });
  }

  if (!candidateId || typeof candidateId !== "string") {
    return res.status(400).json({
      error: {
        code: "invalid_input",
        message: "candidateId is required",
      },
    });
  }

  const submission = await Submission.create({
    tenantId,
    assessmentId,
    candidateId,
    status,
    score,
    submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
    durationSeconds,
    responses,
  });

  // For create endpoints it's often fine to return the full document
  res.status(201).json({ data: submission.toObject() });
}

/**
 * List submissions for a tenant with common filters.
 *
 * Performance optimizations:
 * - All queries are scoped by tenantId and use compound indexes on
 *   (tenantId, assessmentId, submittedAt) or similar.
 * - We project only small fields required for list views; heavy `responses`
 *   payloads are excluded.
 * - We use lean() and paginate.
 */
async function listSubmissions(req, res) {
  const tenantId = req.tenantId;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10) || 50;
  const limit = Math.min(Math.max(limitRaw, 1), 200); // cap upper bound
  const skip = (page - 1) * limit;

  const { assessmentId, candidateId, status, from, to } = req.query;

  const filter = { tenantId };

  if (assessmentId) {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        error: {
          code: "invalid_input",
          message: "Invalid assessmentId",
        },
      });
    }
    filter.assessmentId = new mongoose.Types.ObjectId(assessmentId);
  }

  if (candidateId) {
    filter.candidateId = candidateId;
  }

  if (status) {
    filter.status = status;
  }

  if (from || to) {
    filter.submittedAt = {};
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        filter.submittedAt.$gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        filter.submittedAt.$lte = toDate;
      }
    }
    if (Object.keys(filter.submittedAt).length === 0) {
      delete filter.submittedAt;
    }
  }

  // Sort newest submissions first to leverage (tenantId, assessmentId, submittedAt) index
  const sort = { submittedAt: -1, _id: -1 };

  const projection = {
    assessmentId: 1,
    candidateId: 1,
    status: 1,
    score: 1,
    submittedAt: 1,
    durationSeconds: 1,
    createdAt: 1,
  };

  const [items, total] = await Promise.all([
    Submission.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean(),
    Submission.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.json({
    data: items,
    page,
    limit,
    total,
    totalPages,
  });
}

/**
 * Get all submissions for a single assessment for the tenant with pagination.
 * This is a common high‑volume endpoint used by reporting UIs.
 */
async function listSubmissionsForAssessment(req, res) {
  const tenantId = req.tenantId;
  const { assessmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    return res.status(400).json({
      error: {
        code: "invalid_input",
        message: "Invalid assessmentId",
      },
    });
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10) || 50;
  const limit = Math.min(Math.max(limitRaw, 1), 200);
  const skip = (page - 1) * limit;

  const filter = {
    tenantId,
    assessmentId: new mongoose.Types.ObjectId(assessmentId),
  };

  const sort = { submittedAt: -1, _id: -1 };

  const projection = {
    candidateId: 1,
    status: 1,
    score: 1,
    submittedAt: 1,
    durationSeconds: 1,
  };

  const [items, total] = await Promise.all([
    Submission.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean(),
    Submission.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.json({
    data: items,
    page,
    limit,
    total,
    totalPages,
  });
}

module.exports = {
  createSubmission,
  listSubmissions,
  listSubmissionsForAssessment,
};
