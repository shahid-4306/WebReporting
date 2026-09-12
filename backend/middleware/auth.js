// import { verifySessionToken } from "../utils/authTokens.js";
// import { findById } from "../db/usersRepo.js";
// import { getRoleIdForUserCode } from "../db/userRoleMapRepo.js";
// import { getPermittedMenuKeysForUser } from "../db/roleMenuPermissionsRepo.js";

// // Reads the Bearer token, verifies it, loads the *current* user row from the
// // database (not just what's in the token) so a role change or account
// // deactivation takes effect immediately, and attaches it to req.user.
// //
// // This is the actual backend authorization gate — every route below uses
// // this (or requireRole) rather than trusting anything the frontend sends,
// // so hiding a button in the UI is never the only thing standing between a
// // user and data they shouldn't see.
// export async function requireAuth(req, res, next) {
//   try {
//     const header = req.headers.authorization || "";
//     const token = header.startsWith("Bearer ") ? header.slice(7) : null;
//     if (!token) return res.status(401).json({ error: "Unauthorized" });

//     const payload = verifySessionToken(token);
//     const user = await findById(payload.sub); // already mapped (see usersRepo.findById)
//     if (!user || !user.active) return res.status(401).json({ error: "Unauthorized" });

//     // Menu-Based RBAC role isn't a column on the ERP USERS table — it lives
//     // in the app-owned admin.APP_USER_ROLE_MAP bridge table, keyed by
//     // USER_CODE. Attaching it fresh on every request means a role change
//     // made in Role Management takes effect on the user's very next request,
//     // no re-login required.
//     user.role_id = await getRoleIdForUserCode(user.id);

//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }
// }

// // Usage: requireRole("admin")
// export function requireRole(...roles) {
//   return (req, res, next) => {
//     if (!req.user || !roles.includes(req.user.role)) {
//       return res.status(403).json({ error: "Forbidden" });
//     }
//     next();
//   };
// }

// // Usage: requireMenu("general_ledger")
// //
// // Menu-Based RBAC enforcement at the route level: blocks a request unless
// // the authenticated user's role has been explicitly granted this MENU_KEY
// // (admins always pass — same "implicit full access" behaviour as every
// // other access check in this app). This is what stops a non-admin from
// // reaching an unauthorized report by calling its API directly even though
// // the matching sidebar entry/page is hidden — hiding the UI alone is never
// // treated as sufficient authorization.
// //
// // Uses the SAME 401/403 shape as requireAuth/requireRole above (a valid,
// // still-authenticated session simply gets a 403 for this one resource) —
// // no new response format is introduced.
// export function requireMenu(menuKey) {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) return res.status(401).json({ error: "Unauthorized" });
//       const permitted = await getPermittedMenuKeysForUser(req.user);
//       if (permitted === null || permitted.has(menuKey)) return next();
//       return res.status(403).json({ error: "Forbidden" });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Failed to verify menu access" });
//     }
//   };
// }


import { verifySessionToken } from "../utils/authTokens.js";
import { findById } from "../db/usersRepo.js";
import { getRoleIdForUserCode } from "../db/userRoleMapRepo.js";
import { getPermittedMenuKeysForUser } from "../db/roleMenuPermissionsRepo.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = verifySessionToken(token);
    const user = await findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: "Unauthorized" });

    // Get role_id from USER_ROLE_MAP table
    user.role_id = await getRoleIdForUserCode(user.id);
    
    // Log for debugging
    console.log("🔍 Auth user:", {
      id: user.id,
      username: user.username,
      role: user.role,
      role_id: user.role_id
    });

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function requireMenu(menuKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const permitted = await getPermittedMenuKeysForUser(req.user);
      if (permitted === null || permitted.has(menuKey)) return next();
      return res.status(403).json({ error: "Forbidden" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to verify menu access" });
    }
  };
}