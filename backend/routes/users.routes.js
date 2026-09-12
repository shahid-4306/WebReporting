
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as users from "../db/usersRepo.js";
import * as roles from "../db/rolesRepo.js";
import * as userRoleMap from "../db/userRoleMapRepo.js";
import { getPool, sql } from "../db/pool.js";
import { USERS_TABLE } from "../db/tables.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

// Helper function to validate role ID
function validateRoleId(roleId) {
  if (roleId === null || roleId === undefined || roleId === '') {
    return null;
  }
  const numId = Number(roleId);
  if (!Number.isInteger(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// GET /api/users
router.get("/", async (req, res) => {
  try {
    const [list, roleMap, allRoles] = await Promise.all([
      users.listUsers(), 
      userRoleMap.getAllMappings(), 
      roles.listAll()
    ]);
    
    const roleNameById = Object.fromEntries(allRoles.map((r) => [r.id, r.name]));
    
    const withRole = list.map((u) => {
      const mapping = roleMap[u.id] || null;
      const roleId = mapping ? mapping.role_id : null;
      
      return {
        ...u,
        role_id: roleId,
        role_name: roleId ? roleNameById[roleId] : undefined,
        is_primary: mapping ? mapping.is_primary : false
      };
    });
    
    res.json(withRole);
  } catch (err) {
    console.error("Error in GET /api/users:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// POST /api/users - Create new user
router.post("/", async (req, res) => {
  try {
    const { user_code, user_name, user_password, role_id } = req.body || {};
    
    if (!user_code || !user_password) {
      return res.status(400).json({ error: "user_code and user_password are required" });
    }
    
    if (user_code.length > 8) {
      return res.status(400).json({ error: "User code must be 8 characters or less" });
    }
    
    if (user_password.length > 10) {
      return res.status(400).json({ error: "Password must be 10 characters or less" });
    }

    // Validate the role up front
    if (role_id) {
      const validRoleId = validateRoleId(role_id);
      if (!validRoleId) {
        return res.status(400).json({ error: "Invalid role_id format" });
      }
      
      const role = await roles.findById(validRoleId);
      if (!role) {
        return res.status(400).json({ error: "Unknown role_id" });
      }
    }
    
    const pool = await getPool();
    
    // Check if user already exists
    const existing = await pool.request()
      .input("userCode", sql.NVarChar, String(user_code).trim())
      .query(`SELECT USER_CODE FROM ${USERS_TABLE} WHERE USER_CODE = @userCode`);
    
    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: "User code already exists" });
    }
    
    const trimmedUserCode = String(user_code).trim();

    // Insert new user
    await pool.request()
      .input("userCode", sql.NVarChar, trimmedUserCode)
      .input("userName", sql.NVarChar, user_name || trimmedUserCode)
      .input("userPassword", sql.NVarChar, user_password)
      .input("roleCode", sql.NVarChar, "USER")
      .input("active", sql.Bit, 1)
      .query(`
        INSERT INTO ${USERS_TABLE} (USER_CODE, USER_NAME, USER_PASSWORD, ROLE_CODE, ACTIVE)
        VALUES (@userCode, @userName, @userPassword, @roleCode, @active)
      `);

    // Save the Menu-Based RBAC role relationship
    if (role_id) {
      const validRoleId = validateRoleId(role_id);
      if (validRoleId) {
        await userRoleMap.setRoleIdForUserCode(trimmedUserCode, validRoleId);
      }
    }
    
    res.status(201).json({ 
      ok: true, 
      message: "User created successfully", 
      user_code: trimmedUserCode, 
      role_id: role_id || null 
    });
  } catch (err) {
    console.error("Error in POST /api/users:", err);
    res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

// PATCH /api/users/:id/role-id - Assign role to user
router.patch("/:id/role-id", async (req, res) => {
  try {
    const { role_id } = req.body || {};
    const userCode = req.params.id;
    
    if (!userCode) {
      return res.status(400).json({ error: "User code is required" });
    }
    
    // If role_id is provided, validate it
    if (role_id) {
      const validRoleId = validateRoleId(role_id);
      if (!validRoleId) {
        return res.status(400).json({ error: "Invalid role_id format" });
      }
      
      const role = await roles.findById(validRoleId);
      if (!role) {
        return res.status(400).json({ error: "Unknown role_id" });
      }
      
      await userRoleMap.setRoleIdForUserCode(userCode, validRoleId);
    } else {
      // Clear role assignment
      await userRoleMap.setRoleIdForUserCode(userCode, null);
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error("Error in PATCH /api/users/:id/role-id:", err);
    res.status(500).json({ error: "Failed to assign role" });
  }
});

// GET /api/users/:id - Get single user
router.get("/:id", async (req, res) => {
  try {
    const user = await users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const roleId = await userRoleMap.getRoleIdForUserCode(req.params.id);
    
    res.json({
      ...user,
      role_id: roleId
    });
  } catch (err) {
    console.error("Error in GET /api/users/:id:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

// PUT /api/users/:id - Update an existing user's name and/or password
// Lets an admin correct/manage a user's details after creation without
// touching USER_CODE (the immutable id) or ROLE_CODE/ACTIVE, which have
// their own dedicated endpoints below.
router.put("/:id", async (req, res) => {
  try {
    const userCode = String(req.params.id || "").trim();
    if (!userCode) {
      return res.status(400).json({ error: "User code is required" });
    }

    const existingUser = await users.findById(userCode);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const { user_name, user_password } = req.body || {};

    // At least one editable field must be supplied
    if (user_name === undefined && user_password === undefined) {
      return res.status(400).json({ error: "Nothing to update: provide user_name and/or user_password" });
    }

    if (user_name !== undefined && !String(user_name).trim()) {
      return res.status(400).json({ error: "user_name cannot be empty" });
    }

    if (user_password !== undefined) {
      if (!String(user_password).trim()) {
        return res.status(400).json({ error: "user_password cannot be empty" });
      }
      if (String(user_password).length > 10) {
        return res.status(400).json({ error: "Password must be 10 characters or less" });
      }
    }

    const pool = await getPool();
    const request = pool.request().input("userCode", sql.NVarChar, userCode);

    const setClauses = [];
    if (user_name !== undefined) {
      request.input("userName", sql.NVarChar, String(user_name).trim());
      setClauses.push("USER_NAME = @userName");
    }
    if (user_password !== undefined) {
      request.input("userPassword", sql.NVarChar, String(user_password));
      setClauses.push("USER_PASSWORD = @userPassword");
    }

    await request.query(`
      UPDATE ${USERS_TABLE}
      SET ${setClauses.join(", ")}
      WHERE USER_CODE = @userCode
    `);

    const updated = await users.findById(userCode);
    const roleId = await userRoleMap.getRoleIdForUserCode(userCode);
    res.json({ ok: true, message: "User updated successfully", ...updated, role_id: roleId });
  } catch (err) {
    console.error("Error in PUT /api/users/:id:", err);
    res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

// PATCH /api/users/:id/status - Activate or deactivate a user
// This is how a user is "removed" from the system going forward: soft
// deactivation (ACTIVE flag) rather than a destructive delete, so history
// (role assignments, report access, audit trail) is preserved.
router.patch("/:id/status", async (req, res) => {
  try {
    const userCode = String(req.params.id || "").trim();
    if (!userCode) {
      return res.status(400).json({ error: "User code is required" });
    }

    const { active } = req.body || {};
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active (boolean) is required" });
    }

    const existingUser = await users.findById(userCode);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Guard against locking every admin out of the system by deactivating
    // the last remaining admin account.
    if (!active && existingUser.role === "admin") {
      const allUsers = await users.listUsers();
      const activeAdminCount = allUsers.filter((u) => u.role === "admin" && u.active).length;
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: "Cannot deactivate the last active admin account" });
      }
    }

    const pool = await getPool();
    await pool
      .request()
      .input("userCode", sql.NVarChar, userCode)
      .input("active", sql.Bit, active ? 1 : 0)
      .query(`UPDATE ${USERS_TABLE} SET ACTIVE = @active WHERE USER_CODE = @userCode`);

    res.json({ ok: true, message: `User ${active ? "activated" : "deactivated"} successfully`, user_code: userCode, active });
  } catch (err) {
    console.error("Error in PATCH /api/users/:id/status:", err);
    res.status(500).json({ error: err.message || "Failed to update user status" });
  }
});

export default router;