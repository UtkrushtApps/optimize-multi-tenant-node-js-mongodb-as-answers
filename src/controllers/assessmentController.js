"use strict";

const Assessment = require("../models/Assessment");

/**
 * List assessments for a given tenant with pagination and filtering.
 *
 * Performance optimizations:
 * - Always filter by tenantId (multi‑tenant isolation and index use).
 * - Use .lean() to return plain objects instead of full Mongoose documents.
 * - Project only fields needed for listing (avoid large descriptions/metadata
 *   if not strictly required).
 * - Use indexed sort fields and paginate using skip/limit.
 * - Run the countDocuments query in parallel with the main query.
 */
async function listAssessments(req, res) {
  const tenantId = req.tenantId;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100); // cap page size to prevent abuse

  const { status, search } = req.query;

  // Only allow sorting by specific, indexed fields
  const allowedSortFields = new Set(["createdAt", "name"]);
  const sortBy = allowedSortFields.has(req.query.sortBy) ? req.query.sortBy : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const filter = { tenantId };

  if (status) {
    filter.status = status;
  }

  if (search && typeof search === "string" && search.trim()) {
    // Prefix search on name per tenant. Because we have an index on
    // { tenantId: 1, name: 1 }, a regex anchored at the beginning can still
    // use the index efficiently for many workloads.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = new RegExp(`^${escaped}`, "i");
  }

  const skip = (page - 1) * limit;

  const projection = {
    name: 1,
    status: 1,
    tags: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  const [items, total] = await Promise.all([
    Assessment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean(),
    Assessment.countDocuments(filter),
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
 * Get a single assessment by id for a tenant.
 *
 * This endpoint is not typically the main performance bottleneck, but we still
 * ensure we scope by tenantId and use lean/projection where appropriate.
 */
async function getAssessmentById(req, res, next) {
  const tenantId = req.tenantId;
  const { assessmentId } = req.params;

  const assessment = await Assessment.findOne({ _id: assessmentId, tenantId })
    .select({
      name: 1,
      description: 1,
      status: 1,
      tags: 1,
      metadata: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .lean();

  if (!assessment) {
    return res.status(404).json({
      error: {
        code: "not_found",
        message: "Assessment not found for this tenant",
      },
    });
  }

  return res.json({ data: assessment });
}

module.exports = {
  listAssessments,
  getAssessmentById,
};
