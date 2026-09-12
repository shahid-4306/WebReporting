

import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as roles from "../db/rolesRepo.js";
import * as menus from "../db/menusRepo.js";
import * as roleMenuPermissions from "../db/roleMenuPermissionsRepo.js";

const router = express.Router();

// Helper function to validate ID (INT type)
function validateId(id) {
  if (id === null || id === undefined || id === '') {
    return false;
  }
  
  const numId = Number(id);
  return Number.isInteger(numId) && numId > 0;
}

router.use(requireAuth, requireRole("admin"));

// GET /api/roles
router.get("/", async (req, res) => {
  try {
    const list = await roles.listAll();
    const withPermissions = await Promise.all(
      list.map(async (r) => {
        let menu_ids = [];
        if (validateId(r.id)) {
          try {
            menu_ids = await roleMenuPermissions.getMenuIdsForRole(r.id);
          } catch (permErr) {
            console.error(`Error fetching permissions for role ${r.id}:`, permErr.message);
            menu_ids = [];
          }
        }
        return { ...r, menu_ids };
      })
    );
    res.json(withPermissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load roles" });
  }
});

// POST /api/roles
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const existing = await roles.findByName(name);
    if (existing) return res.status(409).json({ error: "A role with this name already exists" });
    const created = await roles.create({ name, description });
    res.status(201).json({ ...created, menu_ids: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create role" });
  }
});

// PUT /api/roles/:id
router.put("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id)) {
      return res.status(400).json({ error: "Invalid role ID format. Expected positive integer." });
    }
    
    const role = await roles.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Not found" });
    if (role.is_system) return res.status(400).json({ error: "Built-in roles cannot be renamed" });
    
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    
    const updated = await roles.update(req.params.id, { name, description });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// DELETE /api/roles/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id)) {
      return res.status(400).json({ error: "Invalid role ID format. Expected positive integer." });
    }
    
    const role = await roles.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Not found" });
    if (role.is_system) return res.status(400).json({ error: "Built-in roles cannot be deleted" });
    
    const usersOnRole = await roles.countUsersWithRole(req.params.id);
    if (usersOnRole > 0) return res.status(400).json({ error: "Reassign users off this role before deleting it" });
    
    await roles.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

// PUT /api/roles/:id/permissions
router.put("/:id/permissions", async (req, res) => {
  try {
    if (!validateId(req.params.id)) {
      return res.status(400).json({ error: "Invalid role ID format. Expected positive integer." });
    }
    
    const role = await roles.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Not found" });
    
    const { menu_ids } = req.body || {};
    if (!Array.isArray(menu_ids)) return res.status(400).json({ error: "menu_ids must be an array" });

    const allMenus = await menus.listAll();
    const validIds = new Set(allMenus.map((m) => m.id));
    const filtered = menu_ids.filter((id) => validIds.has(Number(id)));
    
    await roleMenuPermissions.setMenuIdsForRole(req.params.id, filtered);
    res.json({ ok: true, menu_ids: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role permissions" });
  }
});

export default router;