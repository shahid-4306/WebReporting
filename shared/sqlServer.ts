import sql from "npm:mssql@12.7.0";
import { secrets } from "base44:runtime";

function config() {
  return {
    server: secrets.get("SQL_SERVER_HOST"),
    port: parseInt(secrets.get("SQL_SERVER_PORT") || "1433", 10),
    database: secrets.get("SQL_SERVER_DATABASE"),
    user: secrets.get("SQL_SERVER_USER"),
    password: secrets.get("SQL_SERVER_PASSWORD"),
    connectionTimeout: 15000,
    requestTimeout: 30000,
    options: {
      encrypt: (secrets.get("SQL_SERVER_ENCRYPT") || "false").toLowerCase() === "true",
      trustServerCertificate: true,
      enableArithAbort: true,
    },
  };
}

export async function runQuery(sqlText, inputs = {}) {
  let pool;
  try {
    pool = await sql.connect(config());
    pool.on("error", () => {});
    const request = pool.request();
    for (const [key, value] of Object.entries(inputs)) {
      request.input(key, value);
    }
    const result = await request.query(sqlText);
    return result.recordset;
  } finally {
    if (pool) {
      try { await pool.close(); } catch (e) { /* ignore */ }
    }
  }
}

export async function runMulti(statements, inputs = {}) {
  let pool;
  try {
    pool = await sql.connect(config());
    pool.on("error", () => {});
    const results = [];
    for (const stmt of statements) {
      const request = pool.request();
      for (const [key, value] of Object.entries(inputs)) {
        request.input(key, value);
      }
      const result = await request.query(stmt);
      results.push(result.recordset);
    }
    return results;
  } finally {
    if (pool) {
      try { await pool.close(); } catch (e) { /* ignore */ }
    }
  }
}