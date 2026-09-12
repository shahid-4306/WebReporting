import express from "express";
import * as menuRepo from "../db/menuRepo.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/menus - Get current user's menus
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userCode = req.user.id;
    const menus = await menuRepo.getMenusByUserCode(userCode);
    const tree = menuRepo.buildMenuTree(menus);
    res.json({ menus: tree });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch menus" });
  }
});

// GET /api/menus - Get all menus (admin only)
router.get("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const menus = await menuRepo.getAllMenus();
    const tree = menuRepo.buildMenuTree(menus);
    res.json({ menus: tree });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch menus" });
  }
});

// GET /api/menus/role/:roleId - Get menus for a role
router.get("/role/:roleId", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const menus = await menuRepo.getMenusByRoleId(req.params.roleId);
    res.json({ menus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch role menus" });
  }
});

// POST /api/menus/role/:roleId - Assign menus to role
router.post("/role/:roleId", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const { menuIds } = req.body;
    if (!Array.isArray(menuIds)) {
      return res.status(400).json({ error: "menuIds array is required" });
    }
    await menuRepo.assignMenusToRole(req.params.roleId, menuIds);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign menus" });
  }
});

export default router;