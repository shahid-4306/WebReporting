

import { getPool, sql } from "./pool.js";
import { ROLE_MENU_PERMISSIONS_TABLE, MENUS_TABLE } from "./tables.js";
import * as menusRepo from "./menusRepo.js";

// Helper function to validate ID (INT type)
function validateId(id) {
  if (id === null || id === undefined || id === '') {
    return null;
  }
  
  const numId = Number(id);
  
  if (!Number.isInteger(numId) || numId <= 0) {
    console.error('Invalid ID format (expected positive integer):', id);
    return null;
  }
  
  return numId;
}

export async function getMenuIdsForRole(roleId) {
  const validRoleId = validateId(roleId);
  
  if (!validRoleId) {
    console.error('getMenuIdsForRole: Invalid roleId provided:', roleId);
    return [];
  }
  
  const pool = await getPool();
  const res = await pool
    .request()
    .input("roleId", sql.Int, validRoleId)
    .query(`
      SELECT MENU_ID 
      FROM ${ROLE_MENU_PERMISSIONS_TABLE} 
      WHERE ROLE_ID = @roleId AND CAN_VIEW = 1
    `);
  return res.recordset.map((r) => Number(r.MENU_ID));
}

export async function setMenuIdsForRole(roleId, menuIds) {
  const validRoleId = validateId(roleId);
  
  if (!validRoleId) {
    throw new Error('Invalid role ID format');
  }
  
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  
  try {
    await new sql.Request(tx)
      .input("roleId", sql.Int, validRoleId)
      .query(`DELETE FROM ${ROLE_MENU_PERMISSIONS_TABLE} WHERE ROLE_ID = @roleId`);
    
    for (const menuId of menuIds || []) {
      const validMenuId = validateId(menuId);
      
      if (validMenuId) {
        await new sql.Request(tx)
          .input("roleId", sql.Int, validRoleId)
          .input("menuId", sql.Int, validMenuId)
          .query(`
            INSERT INTO ${ROLE_MENU_PERMISSIONS_TABLE} (ROLE_ID, MENU_ID, CAN_VIEW)
            VALUES (@roleId, @menuId, 1)
          `);
      } else {
        console.warn('Skipping invalid menuId:', menuId);
      }
    }
    
    await tx.commit();
    console.log(`✅ Permissions updated for role ${validRoleId}:`, menuIds);
  } catch (err) {
    await tx.rollback();
    console.error('Error in setMenuIdsForRole:', err.message);
    throw err;
  }
}

export function resolveVisibleMenus(allMenus, grantedMenuIds) {
  const byId = new Map(allMenus.map((m) => [Number(m.id), m]));
  const grantedSet = new Set(grantedMenuIds.map(Number));
  const visible = new Set();
  
  for (const id of grantedSet) {
    let cur = byId.get(id);
    let safetyCounter = 0;
    while (cur && cur.is_active && safetyCounter < 100) {
      visible.add(Number(cur.id));
      cur = cur.parent_id ? byId.get(Number(cur.parent_id)) : null;
      safetyCounter++;
    }
  }
  
  return allMenus.filter((m) => visible.has(Number(m.id)));
}

export async function getMenuTreeForRole(role) {
  const allMenus = (await menusRepo.listAll()).filter((m) => m.is_active);
  if (!role) return [];
  
  if (!validateId(role.id)) {
    console.error('getMenuTreeForRole: Invalid role.id:', role.id);
    return [];
  }
  
  const grantedIds = await getMenuIdsForRole(role.id);
  const visible = resolveVisibleMenus(allMenus, grantedIds);
  return menusRepo.buildTree(visible);
}

export async function getPermittedMenuKeysForUser(user) {
  // Admin bypass
  if (user.role === "admin" || user.is_admin) return null;
  if (!user.role_id) return new Set();
  
  const validRoleId = validateId(user.role_id);
  
  if (!validRoleId) {
    console.error('getPermittedMenuKeysForUser: Invalid user.role_id:', user.role_id);
    return new Set();
  }
  
  const pool = await getPool();
  const res = await pool
    .request()
    .input("roleId", sql.Int, validRoleId)
    .query(`
      SELECT m.MENU_KEY
      FROM ${ROLE_MENU_PERMISSIONS_TABLE} p
      JOIN ${MENUS_TABLE} m ON m.ID = p.MENU_ID
      WHERE p.ROLE_ID = @roleId AND p.CAN_VIEW = 1 AND m.IS_ACTIVE = 1
    `);
  return new Set(res.recordset.map((r) => r.MENU_KEY));
}