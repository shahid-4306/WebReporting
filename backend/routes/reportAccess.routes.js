import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as reportAccess from "../db/reportAccessRepo.js";
import * as users from "../db/usersRepo.js";

const router = express.Router();
router.use(requireAuth);

// Both allowed_reports and allowed_companies are optional, but if present
// they must be arrays of plain strings — anything else would silently
// corrupt the stored JSON and is rejected up front instead.
function validateAccessLists(body) {
  const { allowed_reports, allowed_companies } = body || {};
  if (allowed_reports !== undefined) {
    if (!Array.isArray(allowed_reports) || !allowed_reports.every((v) => typeof v === "string")) {
      return "allowed_reports must be an array of strings";
    }
  }
  if (allowed_companies !== undefined) {
    if (!Array.isArray(allowed_companies) || !allowed_companies.every((v) => typeof v === "string")) {
      return "allowed_companies must be an array of strings";
    }
  }
  return null;
}

// GET /api/report-access
// Mirrors the Base44 RLS rule on the ReportAccess entity: admins see every
// record (used by User Management); a non-admin may only ever see their own
// — enforced here server-side, regardless of what the client asks for.
router.get("/", async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.json(await reportAccess.listAll());
    }
    const own = await reportAccess.findByUserId(req.user.id);
    res.json(own ? [own] : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load report access" });
  }
});

// POST /api/report-access  (admin only — create/replace a user's access record)
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { user_id, user_email, allowed_reports, allowed_companies } = req.body || {};
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const listError = validateAccessLists(req.body);
    if (listError) return res.status(400).json({ error: listError });

    const targetUser = await users.findById(user_id);
    if (!targetUser) return res.status(400).json({ error: "Unknown user_id" });

    const rec = await reportAccess.upsert({
      userId: user_id,
      userEmail: user_email,
      allowedReports: allowed_reports,
      allowedCompanies: allowed_companies,
    });
    res.status(201).json(rec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save report access" });
  }
});

// PUT /api/report-access/:id  (admin only — update an existing record by its own id)
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { user_email, allowed_reports, allowed_companies } = req.body || {};

    const listError = validateAccessLists(req.body);
    if (listError) return res.status(400).json({ error: listError });

    const rec = await reportAccess.updateById(req.params.id, {
      userEmail: user_email,
      allowedReports: allowed_reports,
      allowedCompanies: allowed_companies,
    });
    if (!rec) return res.status(404).json({ error: "Not found" });
    res.json(rec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update report access" });
  }
});

export default router;
