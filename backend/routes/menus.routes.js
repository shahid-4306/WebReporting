import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as menus from "../db/menusRepo.js";
import * as roles from "../db/rolesRepo.js";
import { getMenuTreeForRole } from "../db/roleMenuPermissionsRepo.js";

const router = express.Router();
router.use(requireAuth);

// GET /api/menus/my - Current user's menu tree
router.get("/my", async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const all = (await menus.listAll()).filter((m) => m.is_active);
      return res.json(menus.buildTree(all));
    }
    const role = req.user.role_id ? await roles.findById(req.user.role_id) : null;
    const tree = await getMenuTreeForRole(role);
    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load menu" });
  }
});

// Admin-only routes
router.use(requireRole("admin"));

// GET /api/menus - All menus
router.get("/", async (req, res) => {
  try {
    res.json(await menus.listAll());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load menus" });
  }
});

export default router;