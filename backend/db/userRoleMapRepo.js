
import { getPool, sql } from "./pool.js";
import { USER_ROLE_MAP_TABLE, ROLES_TABLE } from "./tables.js";

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

// Helper function to normalize user code
function normalizeUserCode(userCode) {
  if (!userCode) return null;
  return String(userCode).trim().toUpperCase();
}

// Get primary role ID for a user
export async function getRoleIdForUserCode(userCode) {
  try {
    const normalizedCode = normalizeUserCode(userCode);
    
    if (!normalizedCode) {
      console.error('getRoleIdForUserCode: userCode is required');
      return null;
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("userCode", sql.VarChar(8), normalizedCode)
      .query(`
        SELECT TOP 1 ROLE_ID 
        FROM ${USER_ROLE_MAP_TABLE} 
        WHERE USER_CODE = @userCode 
          AND IS_ACTIVE = 1 
        ORDER BY IS_PRIMARY DESC, ROLE_ID
      `);
    
    if (res.recordset.length === 0) {
      console.warn(`No role found for user: ${normalizedCode}`);
      return null;
    }
    
    return Number(res.recordset[0].ROLE_ID);
  } catch (err) {
    console.error('Error in getRoleIdForUserCode:', err.message);
    throw err;
  }
}

// Get all role IDs for a user
export async function getAllRoleIdsForUserCode(userCode) {
  try {
    const normalizedCode = normalizeUserCode(userCode);
    
    if (!normalizedCode) {
      console.error('getAllRoleIdsForUserCode: userCode is required');
      return [];
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("userCode", sql.VarChar(8), normalizedCode)
      .query(`
        SELECT ROLE_ID, IS_PRIMARY, IS_ACTIVE
        FROM ${USER_ROLE_MAP_TABLE} 
        WHERE USER_CODE = @userCode AND IS_ACTIVE = 1
        ORDER BY IS_PRIMARY DESC, ROLE_ID
      `);
    
    return res.recordset.map(r => ({
      role_id: Number(r.ROLE_ID),
      is_primary: !!r.IS_PRIMARY,
      is_active: !!r.IS_ACTIVE
    }));
  } catch (err) {
    console.error('Error in getAllRoleIdsForUserCode:', err.message);
    throw err;
  }
}

// One query for every mapping
export async function getAllMappings() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT USER_CODE, ROLE_ID, IS_PRIMARY, IS_ACTIVE 
      FROM ${USER_ROLE_MAP_TABLE} 
      WHERE IS_ACTIVE = 1
      ORDER BY USER_CODE
    `);
    
    const map = {};
    for (const r of res.recordset) {
      const userCode = normalizeUserCode(r.USER_CODE);
      if (userCode) {
        map[userCode] = {
          role_id: Number(r.ROLE_ID),
          is_primary: !!r.IS_PRIMARY,
          is_active: !!r.IS_ACTIVE
        };
      }
    }
    return map;
  } catch (err) {
    console.error('Error in getAllMappings:', err.message);
    throw err;
  }
}

// Set role for user (replace all existing roles)
export async function setRoleIdForUserCode(userCode, roleId, isPrimary = true) {
  try {
    const normalizedCode = normalizeUserCode(userCode);
    
    if (!normalizedCode) {
      throw new Error('userCode is required');
    }
    
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    
    try {
      // Delete existing mappings
      await new sql.Request(tx)
        .input("userCode", sql.VarChar(8), normalizedCode)
        .query(`
          DELETE FROM ${USER_ROLE_MAP_TABLE} 
          WHERE USER_CODE = @userCode
        `);
      
      // Insert new mapping if roleId provided
      if (roleId) {
        const validRoleId = validateId(roleId);
        
        if (!validRoleId) {
          throw new Error('Invalid role ID format');
        }
        
        await new sql.Request(tx)
          .input("userCode", sql.VarChar(8), normalizedCode)
          .input("roleId", sql.Int, validRoleId)
          .input("isPrimary", sql.Bit, isPrimary ? 1 : 0)
          .query(`
            INSERT INTO ${USER_ROLE_MAP_TABLE} 
            (USER_CODE, ROLE_ID, IS_PRIMARY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
            VALUES 
            (@userCode, @roleId, @isPrimary, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
          `);
      }
      
      await tx.commit();
      console.log(`✅ Role ${roleId || 'cleared'} for user ${normalizedCode}`);
      return true;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Error in setRoleIdForUserCode:', err.message);
    throw err;
  }
}

// Assign additional role to user (keep existing roles)
export async function assignRoleToUser(userCode, roleId, isPrimary = false) {
  try {
    const normalizedCode = normalizeUserCode(userCode);
    
    if (!normalizedCode) {
      throw new Error('userCode is required');
    }
    
    const validRoleId = validateId(roleId);
    
    if (!validRoleId) {
      throw new Error('Invalid role ID format');
    }
    
    const pool = await getPool();
    
    // Check if mapping already exists
    const existing = await pool
      .request()
      .input("userCode", sql.VarChar(8), normalizedCode)
      .input("roleId", sql.Int, validRoleId)
      .query(`
        SELECT ID FROM ${USER_ROLE_MAP_TABLE} 
        WHERE USER_CODE = @userCode AND ROLE_ID = @roleId
      `);
    
    if (existing.recordset.length > 0) {
      // Update existing mapping
      await pool
        .request()
        .input("userCode", sql.VarChar(8), normalizedCode)
        .input("roleId", sql.Int, validRoleId)
        .input("isPrimary", sql.Bit, isPrimary ? 1 : 0)
        .query(`
          UPDATE ${USER_ROLE_MAP_TABLE} 
          SET IS_PRIMARY = @isPrimary, 
              IS_ACTIVE = 1, 
              UPDATED_AT = SYSUTCDATETIME()
          WHERE USER_CODE = @userCode AND ROLE_ID = @roleId
        `);
    } else {
      // Insert new mapping
      await pool
        .request()
        .input("userCode", sql.VarChar(8), normalizedCode)
        .input("roleId", sql.Int, validRoleId)
        .input("isPrimary", sql.Bit, isPrimary ? 1 : 0)
        .query(`
          INSERT INTO ${USER_ROLE_MAP_TABLE} 
          (USER_CODE, ROLE_ID, IS_PRIMARY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
          VALUES 
          (@userCode, @roleId, @isPrimary, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
        `);
    }
    
    // If this is primary, unset other primary roles
    if (isPrimary) {
      await pool
        .request()
        .input("userCode", sql.VarChar(8), normalizedCode)
        .input("roleId", sql.Int, validRoleId)
        .query(`
          UPDATE ${USER_ROLE_MAP_TABLE} 
          SET IS_PRIMARY = 0, UPDATED_AT = SYSUTCDATETIME()
          WHERE USER_CODE = @userCode AND ROLE_ID != @roleId AND IS_ACTIVE = 1
        `);
    }
    
    console.log(`✅ Role ${validRoleId} assigned to user ${normalizedCode}`);
    return true;
  } catch (err) {
    console.error('Error in assignRoleToUser:', err.message);
    throw err;
  }
}

// Remove role from user (soft delete)
export async function removeRoleFromUser(userCode, roleId) {
  try {
    const normalizedCode = normalizeUserCode(userCode);
    
    if (!normalizedCode) {
      throw new Error('userCode is required');
    }
    
    const validRoleId = validateId(roleId);
    
    if (!validRoleId) {
      throw new Error('Invalid role ID format');
    }
    
    const pool = await getPool();
    await pool
      .request()
      .input("userCode", sql.VarChar(8), normalizedCode)
      .input("roleId", sql.Int, validRoleId)
      .query(`
        UPDATE ${USER_ROLE_MAP_TABLE} 
        SET IS_ACTIVE = 0, UPDATED_AT = SYSUTCDATETIME()
        WHERE USER_CODE = @userCode AND ROLE_ID = @roleId
      `);
    
    console.log(`✅ Role ${validRoleId} removed from user ${normalizedCode}`);
    return true;
  } catch (err) {
    console.error('Error in removeRoleFromUser:', err.message);
    throw err;
  }
}

// Get role details for user
export async function getRoleForUserCode(userCode) {
  try {
    const normalizedCode = normalizeUserCode(userCode);
    
    if (!normalizedCode) {
      return null;
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("userCode", sql.VarChar(8), normalizedCode)
      .query(`
        SELECT TOP 1
          r.ID,
          r.NAME,
          r.DESCRIPTION,
          r.IS_SYSTEM,
          r.IS_ADMIN,
          r.CREATED_AT,
          r.UPDATED_AT,
          urm.IS_PRIMARY
        FROM ${USER_ROLE_MAP_TABLE} urm
        INNER JOIN ${ROLES_TABLE} r ON r.ID = urm.ROLE_ID
        WHERE urm.USER_CODE = @userCode 
          AND urm.IS_ACTIVE = 1
        ORDER BY urm.IS_PRIMARY DESC, r.ID
      `);
    
    if (res.recordset.length === 0) {
      return null;
    }
    
    const row = res.recordset[0];
    return {
      id: Number(row.ID),
      name: row.NAME,
      description: row.DESCRIPTION,
      is_system: !!row.IS_SYSTEM,
      is_admin: !!row.IS_ADMIN,
      is_primary: !!row.IS_PRIMARY,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    };
  } catch (err) {
    console.error('Error in getRoleForUserCode:', err.message);
    throw err;
  }
}

// Get all users for a role
export async function getUsersForRole(roleId) {
  try {
    const validRoleId = validateId(roleId);
    
    if (!validRoleId) {
      throw new Error('Invalid role ID format');
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("roleId", sql.Int, validRoleId)
      .query(`
        SELECT USER_CODE, IS_PRIMARY, IS_ACTIVE
        FROM ${USER_ROLE_MAP_TABLE} 
        WHERE ROLE_ID = @roleId AND IS_ACTIVE = 1
        ORDER BY IS_PRIMARY DESC, USER_CODE
      `);
    
    return res.recordset.map(r => ({
      user_code: normalizeUserCode(r.USER_CODE),
      is_primary: !!r.IS_PRIMARY,
      is_active: !!r.IS_ACTIVE
    }));
  } catch (err) {
    console.error('Error in getUsersForRole:', err.message);
    throw err;
  }
}

// Export all functions
export default {
  getRoleIdForUserCode,
  getAllRoleIdsForUserCode,
  getRoleForUserCode,
  getAllMappings,
  setRoleIdForUserCode,
  assignRoleToUser,
  removeRoleFromUser,
  getUsersForRole
};