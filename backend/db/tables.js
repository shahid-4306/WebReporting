
function validateTableName(tableName, fallback) {
  const name = process.env[tableName] || fallback;
  
  // Basic validation - check for SQL injection patterns
  if (name && /^[a-zA-Z0-9_.\[\]]+$/.test(name)) {
    return name;
  }
  
  console.warn(`⚠️ Invalid table name format for ${tableName}, using fallback: ${fallback}`);
  return fallback;
}

// Helper function to get schema and table name separately
function parseTableName(fullTableName) {
  const parts = fullTableName.split('.');
  if (parts.length === 2) {
    return {
      schema: parts[0],
      table: parts[1],
      full: fullTableName
    };
  }
  return {
    schema: 'dbo',
    table: fullTableName,
    full: fullTableName
  };
}

// The REAL, existing ERP login table (USER_CODE / USER_PASSWORD / ROLE_CODE /
// ACTIVE, etc.) — this app only ever SELECTs from it, never writes to it.
export const USERS_TABLE = validateTableName("SQL_USERS_TABLE", "admin.USERS");

// Everything below is a table this backend owns outright (created and
// seeded by `npm run migrate`), namespaced with an APP_ prefix so nothing
// here can ever collide with your existing ERP tables in the same schema.
export const REPORT_ACCESS_TABLE = validateTableName("SQL_REPORT_ACCESS_TABLE", "admin.APP_REPORT_ACCESS");
export const DASHBOARD_CACHE_TABLE = validateTableName("SQL_DASHBOARD_CACHE_TABLE", "admin.APP_DASHBOARD_CACHE");

// ---- Menu-Based Role Access Control (RBAC) tables --------------------------
export const ROLES_TABLE = validateTableName("SQL_ROLES_TABLE", "admin.APP_ROLES");
export const MENUS_TABLE = validateTableName("SQL_MENUS_TABLE", "admin.APP_MENUS");
export const ROLE_MENU_PERMISSIONS_TABLE = validateTableName("SQL_ROLE_MENU_PERMISSIONS_TABLE", "admin.APP_ROLE_MENU_PERMISSIONS");

// Bridges a real ERP USER_CODE to a Menu-Based RBAC role (admin.APP_ROLES).
// Deliberately its own table rather than a column on USERS_TABLE, so
// assigning a role from this app never requires ALTERing your ERP's table.
export const USER_ROLE_MAP_TABLE = validateTableName("SQL_USER_ROLE_MAP_TABLE", "admin.APP_USER_ROLE_MAP");

// Export table metadata for debugging and documentation
export const TABLE_METADATA = {
  USERS_TABLE: {
    name: USERS_TABLE,
    ...parseTableName(USERS_TABLE),
    description: "Existing ERP login table (read-only)",
    owner: "ERP System"
  },
  REPORT_ACCESS_TABLE: {
    name: REPORT_ACCESS_TABLE,
    ...parseTableName(REPORT_ACCESS_TABLE),
    description: "Report access permissions",
    owner: "This Backend"
  },
  DASHBOARD_CACHE_TABLE: {
    name: DASHBOARD_CACHE_TABLE,
    ...parseTableName(DASHBOARD_CACHE_TABLE),
    description: "Dashboard cache for performance",
    owner: "This Backend"
  },
  ROLES_TABLE: {
    name: ROLES_TABLE,
    ...parseTableName(ROLES_TABLE),
    description: "RBAC roles",
    owner: "This Backend"
  },
  MENUS_TABLE: {
    name: MENUS_TABLE,
    ...parseTableName(MENUS_TABLE),
    description: "Menu items for navigation",
    owner: "This Backend"
  },
  ROLE_MENU_PERMISSIONS_TABLE: {
    name: ROLE_MENU_PERMISSIONS_TABLE,
    ...parseTableName(ROLE_MENU_PERMISSIONS_TABLE),
    description: "Role-menu permission mappings",
    owner: "This Backend"
  },
  USER_ROLE_MAP_TABLE: {
    name: USER_ROLE_MAP_TABLE,
    ...parseTableName(USER_ROLE_MAP_TABLE),
    description: "User-role mappings",
    owner: "This Backend"
  }
};

// Helper function to get all table names for migration scripts
export function getAllTableNames() {
  return {
    USERS_TABLE,
    REPORT_ACCESS_TABLE,
    DASHBOARD_CACHE_TABLE,
    ROLES_TABLE,
    MENUS_TABLE,
    ROLE_MENU_PERMISSIONS_TABLE,
    USER_ROLE_MAP_TABLE
  };
}

// Helper function to get tables owned by this backend (for migration)
export function getBackendOwnedTables() {
  return {
    REPORT_ACCESS_TABLE,
    DASHBOARD_CACHE_TABLE,
    ROLES_TABLE,
    MENUS_TABLE,
    ROLE_MENU_PERMISSIONS_TABLE,
    USER_ROLE_MAP_TABLE
  };
}

// Helper function to get read-only tables (ERP tables)
export function getReadOnlyTables() {
  return {
    USERS_TABLE
  };
}

// Validate if a table name is safe for dynamic queries
export function isValidTableName(tableName) {
  return /^[a-zA-Z0-9_.\[\]]+$/.test(tableName);
}

// Export for backward compatibility
export default {
  USERS_TABLE,
  REPORT_ACCESS_TABLE,
  DASHBOARD_CACHE_TABLE,
  ROLES_TABLE,
  MENUS_TABLE,
  ROLE_MENU_PERMISSIONS_TABLE,
  USER_ROLE_MAP_TABLE,
  TABLE_METADATA,
  getAllTableNames,
  getBackendOwnedTables,
  getReadOnlyTables,
  isValidTableName
};