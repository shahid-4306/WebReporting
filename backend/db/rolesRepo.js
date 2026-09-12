
import { getPool, sql } from "./pool.js";
import { ROLES_TABLE, USER_ROLE_MAP_TABLE } from "./tables.js";

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

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.ID,
    name: r.NAME,
    description: r.DESCRIPTION,
    is_system: !!r.IS_SYSTEM,
    is_admin: !!r.IS_ADMIN,
    created_at: r.CREATED_AT,
    updated_at: r.UPDATED_AT,
  };
}

export async function listAll() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT * FROM ${ROLES_TABLE} 
    ORDER BY IS_SYSTEM DESC, IS_ADMIN DESC, NAME
  `);
  return res.recordset.map(mapRow);
}

export async function findById(id) {
  const validId = validateId(id);
  
  if (!validId) {
    console.error('findById: Invalid ID provided:', id);
    return null;
  }
  
  const pool = await getPool();
  const res = await pool
    .request()
    .input("id", sql.Int, validId)
    .query(`SELECT * FROM ${ROLES_TABLE} WHERE ID = @id`);
  return mapRow(res.recordset[0]);
}

export async function findByName(name) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("name", sql.NVarChar, name)
    .query(`SELECT * FROM ${ROLES_TABLE} WHERE NAME = @name`);
  return mapRow(res.recordset[0]);
}

export async function create({ name, description, is_admin = false }) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("name", sql.NVarChar, name)
    .input("description", sql.NVarChar, description || null)
    .input("is_admin", sql.Bit, is_admin ? 1 : 0)
    .query(`
      INSERT INTO ${ROLES_TABLE} (NAME, DESCRIPTION, IS_SYSTEM, IS_ADMIN)
      OUTPUT INSERTED.*
      VALUES (@name, @description, 0, @is_admin)
    `);
  return mapRow(res.recordset[0]);
}

export async function update(id, { name, description, is_admin }) {
  const validId = validateId(id);
  
  if (!validId) {
    throw new Error('Invalid role ID format');
  }
  
  const pool = await getPool();
  const request = pool.request();
  request.input("id", sql.Int, validId);
  request.input("name", sql.NVarChar, name);
  request.input("description", sql.NVarChar, description || null);
  
  let query = `
    UPDATE ${ROLES_TABLE}
    SET NAME = @name, DESCRIPTION = @description, UPDATED_AT = SYSUTCDATETIME()
  `;
  
  if (is_admin !== undefined) {
    request.input("is_admin", sql.Bit, is_admin ? 1 : 0);
    query += `, IS_ADMIN = @is_admin`;
  }
  
  query += ` WHERE ID = @id`;
  
  await request.query(query);
  return findById(validId);
}

export async function countUsersWithRole(id) {
  const validId = validateId(id);
  
  if (!validId) {
    console.error('countUsersWithRole: Invalid ID provided:', id);
    return 0;
  }
  
  const pool = await getPool();
  const res = await pool
    .request()
    .input("id", sql.Int, validId)
    .query(`SELECT COUNT(*) AS c FROM ${USER_ROLE_MAP_TABLE} WHERE ROLE_ID = @id`);
  return res.recordset[0].c;
}

export async function remove(id) {
  const validId = validateId(id);
  
  if (!validId) {
    throw new Error('Invalid role ID format');
  }
  
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, validId)
    .query(`DELETE FROM ${ROLES_TABLE} WHERE ID = @id`);
}

// Get role for a user by ADMIN_CODE
export async function getRoleForUser(adminCode) {
  try {
    if (!adminCode) {
      console.error('getRoleForUser: adminCode is required');
      return null;
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("adminCode", sql.NVarChar, adminCode)
      .query(`
        SELECT r.* 
        FROM ${ROLES_TABLE} r
        INNER JOIN ${USER_ROLE_MAP_TABLE} urm ON urm.ROLE_ID = r.ID
        WHERE urm.ADMIN_CODE = @adminCode 
          AND urm.IS_ACTIVE = 1 
          AND urm.IS_PRIMARY = 1
      `);
    return mapRow(res.recordset[0]);
  } catch (err) {
    console.error('Error in getRoleForUser:', err.message);
    throw err;
  }
}

// Get all roles for a user
export async function getAllRolesForUser(adminCode) {
  try {
    if (!adminCode) {
      console.error('getAllRolesForUser: adminCode is required');
      return [];
    }
    
    const pool = await getPool();
    const res = await pool
      .request()
      .input("adminCode", sql.NVarChar, adminCode)
      .query(`
        SELECT r.*, urm.IS_PRIMARY
        FROM ${ROLES_TABLE} r
        INNER JOIN ${USER_ROLE_MAP_TABLE} urm ON urm.ROLE_ID = r.ID
        WHERE urm.ADMIN_CODE = @adminCode AND urm.IS_ACTIVE = 1
        ORDER BY urm.IS_PRIMARY DESC, r.NAME
      `);
    return res.recordset.map(r => ({
      ...mapRow(r),
      is_primary: !!r.IS_PRIMARY
    }));
  } catch (err) {
    console.error('Error in getAllRolesForUser:', err.message);
    throw err;
  }
}