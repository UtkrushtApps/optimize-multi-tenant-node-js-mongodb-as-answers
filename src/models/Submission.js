"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Submission schema
 *
 * Each candidate submission is tied to a tenant and an assessment.
 * Larger tenants can have hundreds of thousands or millions of submissions,
 * so indexing and query patterns here are critical for performance.
 */
const SubmissionSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    candidateId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "expired", "cancelled"],
      default: "in_progress",
      index: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      index: true,
    },
    submittedAt: {
      type: Date,
      index: true,
    },
    durationSeconds: {
      type: Number,
      default: null,
    },
    responses: {
      // Potentially large payload; we never project this in listing endpoints
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Critical compound indexes to support high‑volume patterns

// For listing submissions of a given assessment for a tenant sorted by time
SubmissionSchema.index({ tenantId: 1, assessmentId: 1, submittedAt: -1 });

// For filtering submissions by candidate within a tenant over time
SubmissionSchema.index({ tenantId: 1, candidateId: 1, submittedAt: -1 });

// For status‑based reporting per tenant
SubmissionSchema.index({ tenantId: 1, status: 1, submittedAt: -1 });

// For reporting by score ranges per assessment per tenant
SubmissionSchema.index({ tenantId: 1, assessmentId: 1, score: -1 });

module.exports = mongoose.model("Submission", SubmissionSchema);
