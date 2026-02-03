"use strict";

/**
 * Middleware that normalizes tenant context for all multi‑tenant routes.
 *
 * We always scope queries by tenantId. This middleware extracts tenantId from
 * the path parameter (preferred) or a header, and attaches it to req.tenantId.
 *
 * This ensures we never accidentally run a query without tenant scoping, which
 * would be both a security and performance issue.
 */
function tenantContext(req, res, next) {
  const paramTenant = req.params.tenantId;
  const headerTenant = req.header("x-tenant-id");

  const tenantId = paramTenant || headerTenant;

  if (!tenantId || typeof tenantId !== "string" || !tenantId.trim()) {
    return res.status(400).json({
      error: {
        code: "missing_tenant",
        message: "Tenant id must be provided as path parameter or x-tenant-id header",
      },
    });
  }

  req.tenantId = tenantId.trim();
  return next();
}

module.exports = tenantContext;
