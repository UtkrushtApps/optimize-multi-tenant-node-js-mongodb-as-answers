"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Assessment schema
 *
 * Each assessment belongs to a tenant. High‑volume tenants can have many
 * assessments and extremely large numbers of submissions for each assessment.
 *
 * Key performance considerations:
 * - All queries are scoped by tenantId to enforce multi‑tenant isolation.
 * - Listing endpoints sort by createdAt or name and filter by status.
 * - We define compound indexes so that common filter+sort patterns are
 *   index‑covered and efficient even for large tenants.
 */
const AssessmentSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index to support listing assessments by tenant with newest first
AssessmentSchema.index({ tenantId: 1, createdAt: -1 });

// Index to support filtering by (tenantId, status) and sorting by createdAt
AssessmentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

// Index to support quick prefix search on assessment name per tenant
AssessmentSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model("Assessment", AssessmentSchema);
