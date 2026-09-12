// Authenticates against the REAL, existing ERP login table (USER_CODE /
// USER_PASSWORD in admin.USERS — see db/usersRepo.js). Accounts are created
// and managed the same way they always have been, by your existing ERP
// tools; this backend only ever reads that table to check a login and never
// writes to it.
//
// Self-registration, OTP email verification, "forgot password" email links,
// and "Continue with Google" all fundamentally depend on the user having an
// email address on file — this table has no EMAIL column, so those flows
// are intentionally disabled below (with a clear message) rather than
// silently broken or faked.
import express from "express";
import * as users from "../db/usersRepo.js";
import { getRoleIdForUserCode } from "../db/userRoleMapRepo.js";
import { signSessionToken } from "../utils/authTokens.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const NOT_APPLICABLE = {
  error:
    "Not available — accounts are managed in your existing ERP system (admin.USERS), not in this reporting app. Ask your ERP administrator to create or update accounts there.",
};

// POST /api/auth/login  { username, password }
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const rawRow = await users.findRawByUsername(username);
    if (!rawRow || !users.verifyPassword(rawRow, password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = users.toPublicUser(rawRow);
    if (!user.active) {
      return res.status(403).json({ error: "This account is inactive. Contact your administrator." });
    }

    user.role_id = await getRoleIdForUserCode(user.id);
    const token = signSessionToken({ id: user.id, username: user.username, role: user.role });
    res.json({ access_token: token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me — returns the caller's current record (re-read from the
// database, not just the JWT), including their live Menu-Based RBAC role.
// IMPORTANT: this must return the user object directly (not wrapped in a
// `{ user }` envelope) — apiClient.auth.me() is deliberately shaped to
// mirror src/api/mockBackend.js's `auth.me()` (which resolves with the user
// object itself), and AuthContext stores whatever this resolves with
// directly into `user` state. Wrapping it here would make every `user.role`,
// `user.id`, `user.role_id` check across the app (AdminRoute, useMenus,
// AppLayout, etc.) silently see `undefined`, breaking admin-only routing.
router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

// POST /api/auth/logout — stateless JWTs: nothing to invalidate server-side,
// the frontend just discards the token. Kept as a route so the frontend's
// existing logout call doesn't need special-casing.
router.post("/logout", (req, res) => res.json({ ok: true }));

// ---- Disabled: these all require an email address this table doesn't have ----
router.post("/register", (req, res) => res.status(501).json(NOT_APPLICABLE));
router.post("/verify-otp", (req, res) => res.status(501).json(NOT_APPLICABLE));
router.post("/resend-otp", (req, res) => res.status(501).json(NOT_APPLICABLE));
router.post("/forgot-password", (req, res) => res.status(501).json(NOT_APPLICABLE));
router.post("/reset-password", (req, res) => res.status(501).json(NOT_APPLICABLE));
router.get("/google", (req, res) => res.status(501).json(NOT_APPLICABLE));
router.get("/google/callback", (req, res) => res.status(501).json(NOT_APPLICABLE));

export default router;
