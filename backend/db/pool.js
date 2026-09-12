

import sql from "mssql";

// SQL_SERVER_HOST may be given as a plain hostname ("localhost") or as a
// named SQL Server instance ("DESKTOP-SJJS8GS\SQL2019"). node-mssql/tedious
// needs the instance name passed separately via options.instanceName rather
// than left in the `server` string, so split it out here instead of
// forwarding the raw value — this is what actually lets a named-instance
// connection string like the one in backend/.env connect successfully.
// When SQL_SERVER_PORT is also set (a static port, common when the DBA has
// disabled the SQL Browser service / dynamic port resolution), it's passed
// through as-is and takes precedence over instance-name-based discovery.
function parseServer(raw) {
  if (!raw) return { server: raw, instanceName: undefined };
  const [server, instanceName] = raw.split("\\");
  return { server, instanceName: instanceName || undefined };
}

function config() {
  const { server, instanceName } = parseServer(process.env.SQL_SERVER_HOST);
  const hasExplicitPort = !!process.env.SQL_SERVER_PORT;
  return {
    server,
    // Only send an explicit port when one was actually configured; when a
    // named instance is given without a port, omit it so tedious resolves
    // the port itself via the SQL Browser service (UDP 1434) instead of
    // wrongly trying the SQL Server default port 1433 on a named instance.
    ...(hasExplicitPort ? { port: parseInt(process.env.SQL_SERVER_PORT, 10) } : {}),
    database: process.env.SQL_SERVER_DATABASE,
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    connectionTimeout: 15000,
    requestTimeout: 30000,
    options: {
      ...(instanceName ? { instanceName } : {}),
      encrypt: (process.env.SQL_SERVER_ENCRYPT || "false").toLowerCase() === "true",
      trustServerCertificate: (process.env.SQL_SERVER_TRUST_CERT || "true").toLowerCase() === "true",
      enableArithAbort: true,
    },
  };
}

// Single shared pool for the whole process (recommended by the mssql docs)
// instead of opening/closing a connection per request.
let poolPromise = null;

export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config())
      .connect()
      .then((pool) => {
        // Enhanced error handling for pool errors
        pool.on("error", (err) => {
          console.error("SQL pool error:", err.message);
          // Log full error for debugging
          if (err.code) {
            console.error("Error code:", err.code);
          }
          if (err.number) {
            console.error("Error number:", err.number);
          }
        });
        
        // Log successful connection
        console.log("✅ SQL Server connected successfully");
        console.log(`   Database: ${process.env.SQL_SERVER_DATABASE}`);
        console.log(`   Server: ${process.env.SQL_SERVER_HOST}`);
        
        return pool;
      })
      .catch((err) => {
        console.error("❌ Failed to connect to SQL Server:", err.message);
        poolPromise = null; // allow retry on next call instead of caching a failed connection forever
        throw err;
      });
  }
  return poolPromise;
}

// Helper function to validate GUID/UUID format
export function validateGuid(id) {
  if (!id || id === 'null' || id === 'undefined' || id === '') {
    return null;
  }
  
  id = String(id).trim();
  
  // GUID/UUID format validation
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!guidRegex.test(id)) {
    return null;
  }
  
  return id;
}

// Enhanced runQuery with better error handling
export async function runQuery(sqlText, inputs = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add inputs with proper type detection
    for (const [key, value] of Object.entries(inputs)) {
      if (value === undefined || value === null) {
        // Skip null/undefined values or handle as needed
        continue;
      }
      
      // Auto-detect GUID values
      const guidValue = validateGuid(value);
      if (guidValue) {
        request.input(key, sql.UniqueIdentifier, guidValue);
      } else {
        request.input(key, value);
      }
    }
    
    const result = await request.query(sqlText);
    return result.recordset;
  } catch (err) {
    console.error("Error in runQuery:", err.message);
    if (err.code === 'EPARAM') {
      console.error("Parameter validation failed. Check input values.");
      if (err.originalError) {
        console.error("Original error:", err.originalError.message);
      }
    }
    throw err;
  }
}

// Enhanced runMulti with better error handling
export async function runMulti(statements, inputs = {}) {
  try {
    const pool = await getPool();
    const results = [];
    
    for (const stmt of statements) {
      const request = pool.request();
      
      // Add inputs with proper type detection
      for (const [key, value] of Object.entries(inputs)) {
        if (value === undefined || value === null) {
          continue;
        }
        
        // Auto-detect GUID values
        const guidValue = validateGuid(value);
        if (guidValue) {
          request.input(key, sql.UniqueIdentifier, guidValue);
        } else {
          request.input(key, value);
        }
      }
      
      const result = await request.query(stmt);
      results.push(result.recordset);
    }
    
    return results;
  } catch (err) {
    console.error("Error in runMulti:", err.message);
    if (err.code === 'EPARAM') {
      console.error("Parameter validation failed. Check input values.");
      if (err.originalError) {
        console.error("Original error:", err.originalError.message);
      }
    }
    throw err;
  }
}

// Helper function to execute stored procedure safely
export async function executeProc(procName, inputs = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    for (const [key, value] of Object.entries(inputs)) {
      if (value === undefined || value === null) {
        continue;
      }
      
      const guidValue = validateGuid(value);
      if (guidValue) {
        request.input(key, sql.UniqueIdentifier, guidValue);
      } else {
        request.input(key, value);
      }
    }
    
    const result = await request.execute(procName);
    return result;
  } catch (err) {
    console.error(`Error executing procedure ${procName}:`, err.message);
    if (err.code === 'EPARAM') {
      console.error("Parameter validation failed. Check input values.");
      if (err.originalError) {
        console.error("Original error:", err.originalError.message);
      }
    }
    throw err;
  }
}

// Helper function to test database connection
export async function testConnection() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT 1 AS test");
    return {
      success: true,
      message: "Database connection successful",
      result: result.recordset[0]
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      error: err
    };
  }
}

// Helper function to close pool (for graceful shutdown)
export async function closePool() {
  if (poolPromise) {
    try {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
      console.log("✅ SQL Server connection pool closed");
    } catch (err) {
      console.error("Error closing pool:", err.message);
    }
  }
}

export { sql };
