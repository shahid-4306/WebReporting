import { getPool, sql } from "./pool.js";
import { REPORT_ACCESS_TABLE } from "./tables.js";

// IMPORTANT: this table already existed in the real database with its own
// shape (ID = int, and the user-linking column is named USER_CODE, not
// USER_ID/UNIQUEIDENTIFIER as an earlier version of this code assumed).
// The queries below are written against that REAL, existing structure:
//   ID (int) | USER_CODE (varchar) | USER_EMAIL (nvarchar) |
//   ALLOWED_REPORTS (nvarchar) | ALLOWED_COMPANIES (nvarchar) |
//   CREATED_AT (datetime2) | UPDATED_AT (datetime2)
// The JS-level field names returned to the rest of the app (user_id, id,
// etc.) are kept the same as before so nothing calling this module needs
// to change.

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.ID,
    user_id: r.USER_CODE,
    user_email: r.USER_EMAIL,
    allowed_reports: JSON.parse(r.ALLOWED_REPORTS || "[]"),
    allowed_companies: JSON.parse(r.ALLOWED_COMPANIES || "[]"),
  };
}

export async function listAll() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT * FROM ${REPORT_ACCESS_TABLE}`);
  return res.recordset.map(mapRow);
}

export async function findById(id) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`SELECT * FROM ${REPORT_ACCESS_TABLE} WHERE ID = @id`);
  return mapRow(res.recordset[0]);
}

export async function findByUserId(userId) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("userCode", sql.NVarChar, userId)
    .query(`SELECT * FROM ${REPORT_ACCESS_TABLE} WHERE USER_CODE = @userCode`);
  return mapRow(res.recordset[0]);
}

export async function updateById(id, { userEmail, allowedReports, allowedCompanies }) {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("allowedReports", sql.NVarChar, JSON.stringify(allowedReports || []))
    .input("allowedCompanies", sql.NVarChar, JSON.stringify(allowedCompanies || []))
    .input("userEmail", sql.NVarChar, userEmail || "")
    .query(`
      UPDATE ${REPORT_ACCESS_TABLE}
      SET ALLOWED_REPORTS = @allowedReports, ALLOWED_COMPANIES = @allowedCompanies,
          USER_EMAIL = COALESCE(NULLIF(@userEmail, ''), USER_EMAIL), UPDATED_AT = SYSUTCDATETIME()
      WHERE ID = @id
    `);
  return findById(id);
}

export async function upsert({ userId, userEmail, allowedReports, allowedCompanies }) {
  const pool = await getPool();
  const existing = await findByUserId(userId);
  if (existing) {
    return updateById(existing.id, { userEmail, allowedReports, allowedCompanies });
  }
  const res = await pool
    .request()
    .input("userCode", sql.NVarChar, userId)
    .input("userEmail", sql.NVarChar, userEmail || "")
    .input("allowedReports", sql.NVarChar, JSON.stringify(allowedReports || []))
    .input("allowedCompanies", sql.NVarChar, JSON.stringify(allowedCompanies || []))
    .query(`
      INSERT INTO ${REPORT_ACCESS_TABLE} (USER_CODE, USER_EMAIL, ALLOWED_REPORTS, ALLOWED_COMPANIES)
      OUTPUT INSERTED.*
      VALUES (@userCode, @userEmail, @allowedReports, @allowedCompanies)
    `);
  return mapRow(res.recordset[0]);
}
