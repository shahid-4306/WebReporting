// Reads real, existing ERP login accounts straight from your admin.USERS
// table (USER_CODE / USER_PASSWORD / ROLE_CODE / ACTIVE, etc.) — the same
// table your desktop ERP app already uses. This backend never INSERTs,
// UPDATEs, or DELETEs a single row here; accounts are created/managed the
// same way they always were (your existing ERP admin tools), not from this
// reporting app. USER_CODE (e.g. "ADMIN") is this app's user id everywhere.
import { getPool, sql } from "./pool.js";
import { USERS_TABLE } from "./tables.js";

// Which USER_CODE(s) get full admin access in this reporting app (bypasses
// every Menu-Based RBAC check, can reach /users and /roles). Configurable
// via ADMIN_USER_CODES in backend/.env (comma-separated), defaults to just
// "ADMIN" — the row already in your admin.USERS table. This does NOT read
// ROLE_CODE as a permissions system (your ERP's ROLE_CODE values — KHI, LHR,
// NADEMKHI, etc. — look like branch/department codes, not a small fixed set
// of access levels), so it's kept as an explicit, editable allow-list
// instead of guessing a mapping that could be wrong.
const ADMIN_USER_CODES = new Set(
  (process.env.ADMIN_USER_CODES || "ADMIN")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
);

function mapRow(r) {
  if (!r) return null;
  const userCode = (r.USER_CODE || "").trim();
  return {
    id: userCode, // USER_CODE is this app's user id (no surrogate UUID here)
    username: userCode,
    email: null, // this ERP table has no email column
    full_name: (r.USER_NAME || "").trim() || userCode,
    description: r.USER_DESCRIPTION || null,
    role_code: r.ROLE_CODE || null, // raw ERP branch/department code, informational only
    role: ADMIN_USER_CODES.has(userCode.toUpperCase()) ? "admin" : "user",
    active: r.ACTIVE === undefined || r.ACTIVE === null ? true : !!Number(r.ACTIVE),
    // role_id (Menu-Based RBAC) is NOT a column on this table — it comes
    // from the separate admin.APP_USER_ROLE_MAP bridge table; see
    // db/userRoleMapRepo.js and middleware/auth.js for where it's attached.
  };
}

// Returns the RAW row (includes USER_PASSWORD) — internal use only, for
// login verification. Never send this outside usersRepo.js.
export async function findRawByUsername(username) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("username", sql.NVarChar, (username || "").trim())
    .query(`SELECT * FROM ${USERS_TABLE} WHERE UPPER(LTRIM(RTRIM(USER_CODE))) = UPPER(@username)`);
  return res.recordset[0] || null;
}

export async function findByUsername(username) {
  return mapRow(await findRawByUsername(username));
}

// USER_CODE doubles as this app's "id" everywhere (JWT subject, route
// params, foreign keys in this app's own tables) since the ERP table has no
// separate surrogate key.
export async function findById(userCode) {
  return findByUsername(userCode);
}

export async function listUsers() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT * FROM ${USERS_TABLE} ORDER BY USER_CODE`);
  return res.recordset.map(mapRow);
}

// Legacy ERP accounts store passwords in plain text in USER_PASSWORD (not a
// hash) — this compares directly, exactly matching how the existing
// desktop ERP app already authenticates against this same table. This
// backend does not weaken or change that; it's the pre-existing scheme.
export function verifyPassword(rawRow, plainPassword) {
  if (!rawRow) return false;
  return String(rawRow.USER_PASSWORD ?? "") === String(plainPassword ?? "");
}

export { mapRow as toPublicUser, ADMIN_USER_CODES };
