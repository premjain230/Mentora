"use strict";

/**
 * Admin-only AI CEO Management & Telemetry Endpoint.
 *
 *   GET /api/admin/ceo
 *   Authorization: Bearer <Firebase ID token>
 *
 *   POST /api/admin/ceo
 *   Authorization: Bearer <Firebase ID token>
 *   { "action": "delegate", "departmentId": "...", "title": "...", "objective": "..." }
 *   { "action": "decision", "department": "...", "title": "...", "rationale": "...", "impact": "..." }
 *   { "action": "approve", "requestId": "..." }
 */

const { applyCors, readJsonBody, sendError } = require("./_shared");
const { requireAdmin } = require("./_admin");
const { aiCeo } = require("./_ai-ceo");

module.exports = async function handler(req, res) {
  if (applyCors(req, res, ["GET", "POST", "OPTIONS"])) return;

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // 1. Authenticate & ensure Admin privilege
  let adminUser;
  try {
    adminUser = await requireAdmin(req);
  } catch (err) {
    const status = err.status || 401;
    return sendError(res, status, err.message || "Admin authorization required");
  }

  // 2. Handle GET: Executive Brief & Department Statuses
  if (req.method === "GET") {
    const brief = aiCeo.getExecutiveBrief();
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, data: brief }));
  }

  // 3. Handle POST: Strategic Actions
  if (req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const action = body.action;

      if (action === "delegate") {
        const { departmentId, title, objective, priority } = body;
        if (!departmentId || !title) {
          return sendError(res, 400, "departmentId and title are required for delegation");
        }
        const task = aiCeo.delegateTask(departmentId, title, objective || "", priority || "P1");
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, task }));
      }

      if (action === "decision") {
        const { department, title, rationale, impact } = body;
        if (!title || !rationale) {
          return sendError(res, 400, "title and rationale are required for decision log");
        }
        const dec = aiCeo.logDecision(department || "ai_ceo", title, rationale, impact || "", adminUser.email);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, decision: dec }));
      }

      if (action === "approve") {
        const { requestId } = body;
        if (!requestId) {
          return sendError(res, 400, "requestId is required for approval");
        }
        const approved = aiCeo.approveRequest(requestId, adminUser.email);
        if (!approved) {
          return sendError(res, 404, "Approval request not found");
        }
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, request: approved }));
      }

      return sendError(res, 400, `Unknown action: ${action}`);
    } catch (err) {
      console.error("[ADMIN_CEO_API_ERROR]", err);
      return sendError(res, 500, err.message || "Failed to process AI CEO action");
    }
  }

  return sendError(res, 405, "Method not allowed");
};
