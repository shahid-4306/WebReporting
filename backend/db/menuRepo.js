

import { getPool, sql } from "./pool.js";
import { MENUS_TABLE } from "./tables.js";

// Helper function to validate ID (INT type)
function validateId(id) {
  if (id === null || id === undefined || id === '') {
    return null;
  }
  
  // Convert to number if string
  const numId = Number(id);
  
  // Check if it's a valid positive integer
  if (!Number.isInteger(numId) || numId <= 0) {
    console.error('Invalid ID format (expected positive integer):', id);
    return null;
  }
  
  return numId;
}

// Helper function to map database row to camelCase object
function mapMenuRow(row) {
  if (!row) return null;
  return {
    id: row.id || row.ID,
    menu_key: row.menu_key || row.MENU_KEY,
    name: row.name || row.NAME,
    display_name: row.display_name || row.DISPLAY_NAME,
    parent_id: row.parent_id || row.PARENT_ID,
    menu_type: row.menu_type || row.MENU_TYPE,
    route_path: row.route_path || row.ROUTE_PATH,
    component_name: row.component_name || row.COMPONENT_NAME,
    icon: row.icon || row.ICON,
    display_order: row.display_order || row.DISPLAY_ORDER,
    is_active: row.is_active !== undefined ? !!row.is_active : !!row.IS_ACTIVE,
    created_at: row.created_at || row.CREATED_AT,
    updated_at: row.updated_at || row.UPDATED_AT,
    children: []
  };
}

// Get all active menus
export async function listAll() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT 
        ID AS id,
        MENU_KEY AS menu_key,
        NAME AS name,
        DISPLAY_NAME AS display_name,
        PARENT_ID AS parent_id,
        MENU_TYPE AS menu_type,
        ROUTE_PATH AS route_path,
        COMPONENT_NAME AS component_name,
        ICON AS icon,
        DISPLAY_ORDER AS display_order,
        IS_ACTIVE AS is_active,
        CREATED_AT AS created_at,
        UPDATED_AT AS updated_at
      FROM ${MENUS_TABLE}
      WHERE IS_ACTIVE = 1
      ORDER BY DISPLAY_ORDER, NAME
    `);
    
    return res.recordset.map(mapMenuRow);
  } catch (err) {
    console.error("Error in menusRepo.listAll:", err.message);
    throw err;
  }
}

// Get all menus including inactive (for admin purposes)
export async function listAllWithInactive() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT 
        ID AS id,
        MENU_KEY AS menu_key,
        NAME AS name,
        DISPLAY_NAME AS display_name,
        PARENT_ID AS parent_id,
        MENU_TYPE AS menu_type,
        ROUTE_PATH AS route_path,
        COMPONENT_NAME AS component_name,
        ICON AS icon,
        DISPLAY_ORDER AS display_order,
        IS_ACTIVE AS is_active,
        CREATED_AT AS created_at,
        UPDATED_AT AS updated_at
      FROM ${MENUS_TABLE}
      ORDER BY IS_ACTIVE DESC, DISPLAY_ORDER, NAME
    `);
    
    return res.recordset.map(mapMenuRow);
  } catch (err) {
    console.error("Error in menusRepo.listAllWithInactive:", err.message);
    throw err;
  }
}

// Build nested tree from flat menu list
export function buildTree(flatMenus) {
  if (!Array.isArray(flatMenus) || flatMenus.length === 0) {
    return [];
  }
  
  const byId = new Map();
  const roots = [];

  // First pass: create nodes
  for (const m of flatMenus) {
    const menu = mapMenuRow(m);
    if (menu && menu.id) {
      byId.set(Number(menu.id), menu);
    }
  }

  // Second pass: build tree structure
  for (const m of flatMenus) {
    const menu = mapMenuRow(m);
    if (!menu || !menu.id) continue;
    
    const node = byId.get(Number(menu.id));
    if (!node) continue;
    
    if (menu.parent_id && byId.has(Number(menu.parent_id))) {
      const parent = byId.get(Number(menu.parent_id));
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort recursively by display_order
  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => {
      const orderA = a.display_order || 0;
      const orderB = b.display_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
    nodes.forEach(n => {
      if (n.children && n.children.length > 0) {
        sortRecursive(n.children);
      }
    });
  };
  
  sortRecursive(roots);

  return roots;
}

// Find menu by ID
export async function findById(id) {
  try {
    // Validate ID
    const validId = validateId(id);
    if (!validId) {
      console.error('menusRepo.findById: Invalid ID provided:', id);
      return null;
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("id", sql.Int, validId)
      .query(`
        SELECT 
          ID AS id,
          MENU_KEY AS menu_key,
          NAME AS name,
          DISPLAY_NAME AS display_name,
          PARENT_ID AS parent_id,
          MENU_TYPE AS menu_type,
          ROUTE_PATH AS route_path,
          COMPONENT_NAME AS component_name,
          ICON AS icon,
          DISPLAY_ORDER AS display_order,
          IS_ACTIVE AS is_active,
          CREATED_AT AS created_at,
          UPDATED_AT AS updated_at
        FROM ${MENUS_TABLE}
        WHERE ID = @id
      `);
    
    return mapMenuRow(res.recordset[0]);
  } catch (err) {
    console.error("Error in menusRepo.findById:", err.message);
    throw err;
  }
}

// Find menu by key
export async function findByKey(menuKey) {
  try {
    if (!menuKey || typeof menuKey !== 'string') {
      console.error('menusRepo.findByKey: Invalid menuKey:', menuKey);
      return null;
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("menuKey", sql.NVarChar, menuKey.trim())
      .query(`
        SELECT 
          ID AS id,
          MENU_KEY AS menu_key,
          NAME AS name,
          DISPLAY_NAME AS display_name,
          PARENT_ID AS parent_id,
          MENU_TYPE AS menu_type,
          ROUTE_PATH AS route_path,
          COMPONENT_NAME AS component_name,
          ICON AS icon,
          DISPLAY_ORDER AS display_order,
          IS_ACTIVE AS is_active,
          CREATED_AT AS created_at,
          UPDATED_AT AS updated_at
        FROM ${MENUS_TABLE}
        WHERE MENU_KEY = @menuKey AND IS_ACTIVE = 1
      `);
    
    return mapMenuRow(res.recordset[0]);
  } catch (err) {
    console.error("Error in menusRepo.findByKey:", err.message);
    throw err;
  }
}

// Find menus by parent ID
export async function findByParentId(parentId) {
  try {
    // Validate parent ID
    const validParentId = validateId(parentId);
    if (!validParentId) {
      console.error('menusRepo.findByParentId: Invalid parentId:', parentId);
      return [];
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("parentId", sql.Int, validParentId)
      .query(`
        SELECT 
          ID AS id,
          MENU_KEY AS menu_key,
          NAME AS name,
          DISPLAY_NAME AS display_name,
          PARENT_ID AS parent_id,
          MENU_TYPE AS menu_type,
          ROUTE_PATH AS route_path,
          COMPONENT_NAME AS component_name,
          ICON AS icon,
          DISPLAY_ORDER AS display_order,
          IS_ACTIVE AS is_active,
          CREATED_AT AS created_at,
          UPDATED_AT AS updated_at
        FROM ${MENUS_TABLE}
        WHERE PARENT_ID = @parentId AND IS_ACTIVE = 1
        ORDER BY DISPLAY_ORDER, NAME
      `);
    
    return res.recordset.map(mapMenuRow);
  } catch (err) {
    console.error("Error in menusRepo.findByParentId:", err.message);
    throw err;
  }
}

// Find root menus (menus without parent)
export async function findRootMenus() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT 
        ID AS id,
        MENU_KEY AS menu_key,
        NAME AS name,
        DISPLAY_NAME AS display_name,
        PARENT_ID AS parent_id,
        MENU_TYPE AS menu_type,
        ROUTE_PATH AS route_path,
        COMPONENT_NAME AS component_name,
        ICON AS icon,
        DISPLAY_ORDER AS display_order,
        IS_ACTIVE AS is_active,
        CREATED_AT AS created_at,
        UPDATED_AT AS updated_at
      FROM ${MENUS_TABLE}
      WHERE PARENT_ID IS NULL AND IS_ACTIVE = 1
      ORDER BY DISPLAY_ORDER, NAME
    `);
    
    return res.recordset.map(mapMenuRow);
  } catch (err) {
    console.error("Error in menusRepo.findRootMenus:", err.message);
    throw err;
  }
}

// Get all leaf menus (menus without children)
export async function findLeafMenus() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT 
        m.ID AS id,
        m.MENU_KEY AS menu_key,
        m.NAME AS name,
        m.DISPLAY_NAME AS display_name,
        m.PARENT_ID AS parent_id,
        m.MENU_TYPE AS menu_type,
        m.ROUTE_PATH AS route_path,
        m.COMPONENT_NAME AS component_name,
        m.ICON AS icon,
        m.DISPLAY_ORDER AS display_order,
        m.IS_ACTIVE AS is_active,
        m.CREATED_AT AS created_at,
        m.UPDATED_AT AS updated_at
      FROM ${MENUS_TABLE} m
      LEFT JOIN ${MENUS_TABLE} c ON c.PARENT_ID = m.ID AND c.IS_ACTIVE = 1
      WHERE c.ID IS NULL AND m.IS_ACTIVE = 1
      ORDER BY m.DISPLAY_ORDER, m.NAME
    `);
    
    return res.recordset.map(mapMenuRow);
  } catch (err) {
    console.error("Error in menusRepo.findLeafMenus:", err.message);
    throw err;
  }
}

// Get all parent menus (menus with children)
export async function findParentMenus() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT DISTINCT
        m.ID AS id,
        m.MENU_KEY AS menu_key,
        m.NAME AS name,
        m.DISPLAY_NAME AS display_name,
        m.PARENT_ID AS parent_id,
        m.MENU_TYPE AS menu_type,
        m.ROUTE_PATH AS route_path,
        m.COMPONENT_NAME AS component_name,
        m.ICON AS icon,
        m.DISPLAY_ORDER AS display_order,
        m.IS_ACTIVE AS is_active,
        m.CREATED_AT AS created_at,
        m.UPDATED_AT AS updated_at
      FROM ${MENUS_TABLE} m
      INNER JOIN ${MENUS_TABLE} c ON c.PARENT_ID = m.ID AND c.IS_ACTIVE = 1
      WHERE m.IS_ACTIVE = 1
      ORDER BY m.DISPLAY_ORDER, m.NAME
    `);
    
    return res.recordset.map(mapMenuRow);
  } catch (err) {
    console.error("Error in menusRepo.findParentMenus:", err.message);
    throw err;
  }
}

// Get menu tree with all descendants
export async function getMenuTree() {
  try {
    const allMenus = await listAll();
    return buildTree(allMenus);
  } catch (err) {
    console.error("Error in menusRepo.getMenuTree:", err.message);
    throw err;
  }
}

// Get breadcrumb path for a menu
export async function getBreadcrumb(menuId) {
  try {
    // Validate menu ID
    const validMenuId = validateId(menuId);
    if (!validMenuId) {
      console.error('menusRepo.getBreadcrumb: Invalid menuId:', menuId);
      return [];
    }
    
    const allMenus = await listAll();
    const byId = new Map(allMenus.map(m => [Number(m.id), m]));
    const breadcrumb = [];
    
    let current = byId.get(validMenuId);
    let safetyCounter = 0; // Prevent infinite loop
    
    while (current && safetyCounter < 100) {
      breadcrumb.unshift(current);
      current = current.parent_id ? byId.get(Number(current.parent_id)) : null;
      safetyCounter++;
    }
    
    return breadcrumb;
  } catch (err) {
    console.error("Error in menusRepo.getBreadcrumb:", err.message);
    throw err;
  }
}

// Export all functions
export default {
  listAll,
  listAllWithInactive,
  buildTree,
  findById,
  findByKey,
  findByParentId,
  findRootMenus,
  findLeafMenus,
  findParentMenus,
  getMenuTree,
  getBreadcrumb
};