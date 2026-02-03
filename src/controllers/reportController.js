"use strict";

const mongoose = require("mongoose");
const Submission = require("../models/Submission");

/**
 * Get aggregated summary statistics for an assessment for a given tenant.
 *
 * This endpoint is a common performance hotspot when tenants have large
 * numbers of submissions. We implement it using a MongoDB aggregation
 * pipeline that:
 * - Uses an index‑friendly $match on (tenantId, assessmentId);
 * - Performs $group operations server‑side, avoiding loading all documents
 *   into Node.js memory;
 * - Returns compact summary information instead of every submission.
 */
async function getAssessmentSummary(req, res) {
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

  const assessmentObjectId = new mongoose.Types.ObjectId(assessmentId);

  const pipeline = [
    {
      $match: {
        tenantId,
        assessmentId: assessmentObjectId,
      },
    },
    {
      // First group by (assessmentId, status) so we can later return
      // per‑status counts while also computing global stats.
      $group: {
        _id: {
          assessmentId: "$assessmentId",
          status: "$status",
        },
        count: { $sum: 1 },
        avgScore: { $avg: "$score" },
        minScore: { $min: "$score" },
        maxScore: { $max: "$score" },
      },
    },
    {
      // Regroup by assessmentId to build a compact summary document.
      $group: {
        _id: "$_id.assessmentId",
        totalSubmissions: { $sum: "$count" },
        // Since some statuses may have null scores, we recompute global
        // min/max/avg from the per‑status metrics.
        avgScore: { $avg: "$avgScore" },
        minScore: { $min: "$minScore" },
        maxScore: { $max: "$maxScore" },
        statusCounts: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        assessmentId: "$_id",
        totalSubmissions: 1,
        avgScore: { $round: ["$avgScore", 2] },
        minScore: 1,
        maxScore: 1,
        statusCounts: 1,
      },
    },
  ];

  const [summary] = await Submission.aggregate(pipeline).allowDiskUse(true);

  if (!summary) {
    return res.json({
      data: {
        assessmentId,
        totalSubmissions: 0,
        avgScore: null,
        minScore: null,
        maxScore: null,
        statusCounts: [],
      },
    });
  }

  res.json({ data: summary });
}

/**
 * Returns a lightweight time‑bucketed submissions chart for an assessment.
 *
 * This shows how many submissions were completed per day in a given
 * date range. Implemented entirely in MongoDB using $group by date, which is
 * efficient even for very large collections.
 */
async function getAssessmentDailyActivity(req, res) {
  const tenantId = req.tenantId;
  const { assessmentId } = req.params;
  const { from, to } = req.query;

  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    return res.status(400).json({
      error: {
        code: "invalid_input",
        message: "Invalid assessmentId",
      },
    });
  }

  const assessmentObjectId = new mongoose.Types.ObjectId(assessmentId);

  const match = {
    tenantId,
    assessmentId: assessmentObjectId,
  };

  if (from || to) {
    match.submittedAt = {};
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        match.submittedAt.$gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        match.submittedAt.$lte = toDate;
      }
    }
    if (Object.keys(match.submittedAt).length === 0) {
      delete match.submittedAt;
    }
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: "$submittedAt" },
          month: { $month: "$submittedAt" },
          day: { $dayOfMonth: "$submittedAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.day": 1,
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
          },
        },
        count: 1,
      },
    },
  ];

  const buckets = await Submission.aggregate(pipeline).allowDiskUse(true);

  res.json({ data: buckets });
}

module.exports = {
  getAssessmentSummary,
  getAssessmentDailyActivity,
};
