// Creates this app's OWN tables (report access, dashboard cache, RBAC roles/
// menus/permissions, the user<->role bridge) if they don't already exist,
// and seeds the menu tree + default roles. Safe to run repeatedly — every
// statement is guarded with an OBJECT_ID/IF NOT EXISTS check.
//
// IMPORTANT: this script never creates, alters, or writes to USERS_TABLE
// (admin.USERS) — that is your real, existing ERP login table. This app
// only ever reads from it.
//
// Usage: npm run migrate   (reads .env via dotenv, see package.json)

import "dotenv/config";
import { getPool, sql } from "./pool.js";
import {
  USERS_TABLE,
  REPORT_ACCESS_TABLE,
  DASHBOARD_CACHE_TABLE,
  ROLES_TABLE,
  MENUS_TABLE,
  ROLE_MENU_PERMISSIONS_TABLE,
  USER_ROLE_MAP_TABLE,
} from "./tables.js";
import { MENU_SEED } from "./menuSeedData.js";

function splitTable(qualified) {
  const [schema, name] = qualified.includes(".") ? qualified.split(".") : ["dbo", qualified];
  return { schema, name };
}

async function ensureSchema(pool, schema) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${schema}')
    EXEC('CREATE SCHEMA ${schema}');
  `);
}

async function createTable(pool, qualifiedName, columnsSql) {
  const { schema, name } = splitTable(qualifiedName);
  await ensureSchema(pool, schema);
  const objectId = `${schema}.${name}`;
  await pool.request().query(`
    IF OBJECT_ID('${objectId}', 'U') IS NULL
    BEGIN
      CREATE TABLE ${objectId} (
        ${columnsSql}
      );
    END
  `);
  console.log(`OK  ${objectId}`);
}

// createTable() only creates a table when its name doesn't already exist —
// so if SQL_*_TABLE in .env happens to point at a table from another
// application (e.g. more of your ERP's own data in the same "admin"
// schema), migrate.js silently does nothing, and the app then fails much
// later at runtime with a confusing "Invalid column name 'X'" error instead
// of a clear one here. This check catches that immediately, right after
// each table is (or isn't) created, with a message that says exactly what
// happened and how to fix it.
async function assertHasColumns(pool, qualifiedTable, requiredColumns) {
  const { schema, name } = splitTable(qualifiedTable);
  const res = await pool.request().query(`
    SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID('${schema}.${name}')
  `);
  const existing = new Set(res.recordset.map((r) => r.name));
  const missing = requiredColumns.filter((c) => !existing.has(c));
  if (missing.length > 0) {
    throw new Error(
      `${schema}.${name} exists in this database but is missing the column(s) this app ` +
        `needs: ${missing.join(", ")}.\n` +
        `If this is meant to be a table this backend owns, change the relevant SQL_*_TABLE ` +
        `variable in backend/.env to a name that does not already exist in this database ` +
        `(e.g. "${schema}.APP_${name}"), then run npm run migrate again. If this is your real ` +
        `USERS_TABLE (the ERP login table), check that SQL_USERS_TABLE in .env points at the ` +
        `table that actually has ${requiredColumns.join(", ")} columns.`
    );
  }
}

async function main() {
  const pool = await getPool();

  // ---- Sanity check: USERS_TABLE must be your real, existing ERP login
  // table (USER_CODE / USER_PASSWORD / ROLE_CODE / ACTIVE). This app never
  // creates or alters it — only verifies the columns it depends on for
  // login are actually there, so a misconfigured SQL_USERS_TABLE fails
  // clearly here instead of as a cryptic SQL error during login.
  await assertHasColumns(pool, USERS_TABLE, ["USER_CODE", "USER_PASSWORD"]);
  console.log(`OK  ${USERS_TABLE} (existing ERP table — verified only, not modified)`);

  // NOTE: in this deployment's real database, admin.APP_REPORT_ACCESS
  // already exists with ID as an int identity column and the user-linking
  // column named USER_CODE (not USER_ID/UNIQUEIDENTIFIER). The CREATE below
  // (used only when the table doesn't exist yet) and the column check are
  // written to match that real, existing shape — see db/reportAccessRepo.js.
  await createTable(
    pool,
    REPORT_ACCESS_TABLE,
    `
      ID                INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
      USER_CODE         NVARCHAR(50)     NOT NULL UNIQUE,  -- USER_CODE from ${USERS_TABLE}
      USER_EMAIL        NVARCHAR(255)    NULL,
      ALLOWED_REPORTS   NVARCHAR(MAX)    NOT NULL DEFAULT '[]',  -- JSON array of report keys (legacy, unused by Menu-Based RBAC)
      ALLOWED_COMPANIES NVARCHAR(MAX)    NOT NULL DEFAULT '[]',  -- JSON array of company codes
      CREATED_AT        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      UPDATED_AT        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
    `
  );
  await assertHasColumns(pool, REPORT_ACCESS_TABLE, ["ID", "USER_CODE", "ALLOWED_REPORTS", "ALLOWED_COMPANIES"]);

  await createTable(
    pool,
    DASHBOARD_CACHE_TABLE,
    `
      ID             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
      COMPANY_CODE   NVARCHAR(20)     NOT NULL,
      COST_CENTER    NVARCHAR(20)     NOT NULL DEFAULT 'ALL',
      DATE_FROM      DATE             NOT NULL,
      DATE_TO        DATE             NOT NULL,
      SUMMARY_JSON   NVARCHAR(MAX)    NULL,
      TREND_JSON     NVARCHAR(MAX)    NULL,
      DAILY_TREND_JSON NVARCHAR(MAX)  NULL,
      TOP_ITEMS_JSON NVARCHAR(MAX)    NULL,
      CUSTOMER_SALES_JSON NVARCHAR(MAX) NULL,
      CREATED_BY_ID  NVARCHAR(50)     NULL,   -- USER_CODE from ${USERS_TABLE}
      CREATED_AT     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT UQ_dashboard_cache_key UNIQUE (COMPANY_CODE, COST_CENTER, DATE_FROM, DATE_TO, CREATED_BY_ID)
    `
  );
  await assertHasColumns(pool, DASHBOARD_CACHE_TABLE, ["ID", "COMPANY_CODE", "SUMMARY_JSON"]);

  await createTable(
    pool,
    ROLES_TABLE,
    `
      ID          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
      NAME        NVARCHAR(100)    NOT NULL UNIQUE,
      DESCRIPTION NVARCHAR(255)    NULL,
      IS_SYSTEM   BIT              NOT NULL DEFAULT 0,  -- built-in role (Administrator/Standard User); cannot be deleted
      CREATED_AT  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      UPDATED_AT  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
    `
  );
  await assertHasColumns(pool, ROLES_TABLE, ["ID", "NAME", "IS_SYSTEM"]);

  await createTable(
    pool,
    MENUS_TABLE,
    `
      ID             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
      MENU_KEY       NVARCHAR(100)    NOT NULL UNIQUE,   -- stable machine key (matches report keys for report items)
      NAME           NVARCHAR(150)    NOT NULL,
      DISPLAY_NAME   NVARCHAR(150)    NOT NULL,
      PARENT_ID      UNIQUEIDENTIFIER NULL,
      MENU_TYPE      NVARCHAR(20)     NOT NULL DEFAULT 'item',  -- 'module' | 'group' | 'item'
      ROUTE_PATH     NVARCHAR(255)    NULL,
      COMPONENT_NAME NVARCHAR(150)    NULL,
      ICON           NVARCHAR(100)    NULL,
      DISPLAY_ORDER  INT              NOT NULL DEFAULT 0,
      IS_ACTIVE      BIT              NOT NULL DEFAULT 1,
      CREATED_AT     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      UPDATED_AT     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_menus_parent FOREIGN KEY (PARENT_ID) REFERENCES ${MENUS_TABLE}(ID)
    `
  );
  await assertHasColumns(pool, MENUS_TABLE, ["ID", "MENU_KEY", "PARENT_ID", "MENU_TYPE"]);

  await createTable(
    pool,
    ROLE_MENU_PERMISSIONS_TABLE,
    `
      ID         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
      ROLE_ID    UNIQUEIDENTIFIER NOT NULL,
      MENU_ID    UNIQUEIDENTIFIER NOT NULL,
      CAN_VIEW   BIT              NOT NULL DEFAULT 1,
      CREATED_AT DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT UQ_role_menu UNIQUE (ROLE_ID, MENU_ID),
      CONSTRAINT FK_role_menu_role FOREIGN KEY (ROLE_ID) REFERENCES ${ROLES_TABLE}(ID) ON DELETE CASCADE,
      CONSTRAINT FK_role_menu_menu FOREIGN KEY (MENU_ID) REFERENCES ${MENUS_TABLE}(ID) ON DELETE CASCADE
    `
  );
  await assertHasColumns(pool, ROLE_MENU_PERMISSIONS_TABLE, ["ID", "ROLE_ID", "MENU_ID", "CAN_VIEW"]);

  // Bridges a real ERP USER_CODE to a Menu-Based RBAC role. A separate,
  // app-owned table instead of a column on USERS_TABLE — assigning a role
  // from this app's UI never requires touching your ERP's own table.
  await createTable(
    pool,
    USER_ROLE_MAP_TABLE,
    `
      USER_CODE  NVARCHAR(50)     NOT NULL PRIMARY KEY,
      ROLE_ID    UNIQUEIDENTIFIER NOT NULL,
      CREATED_AT DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      UPDATED_AT DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_user_role_map_role FOREIGN KEY (ROLE_ID) REFERENCES ${ROLES_TABLE}(ID) ON DELETE CASCADE
    `
  );
  await assertHasColumns(pool, USER_ROLE_MAP_TABLE, ["USER_CODE", "ROLE_ID"]);

  await seedMenuRbac(pool);

  console.log("\nMigration complete.");
  process.exit(0);
}

// Idempotent seed: default roles, the full menu tree, and default
// permissions. Safe to re-run — every step upserts by a natural/unique key
// instead of blindly inserting.
async function seedMenuRbac(pool) {
  // 1. Default roles. "Administrator" gets every menu below (equivalent to
  //    the ADMIN_USER_CODES allow-list's implicit full access — assigning
  //    it explicitly too means it shows up correctly in Role Management).
  //    "Standard User" starts with no menu access; grant menus as needed.
  const defaultRoles = [
    { name: "Administrator", description: "Full access to every menu.", isSystem: true },
    { name: "Standard User", description: "No menu access by default — grant menus as needed.", isSystem: true },
  ];
  const roleIdByName = {};
  for (const r of defaultRoles) {
    const existing = await pool.request().input("name", sql.NVarChar, r.name).query(`
      SELECT ID FROM ${ROLES_TABLE} WHERE NAME = @name
    `);
    if (existing.recordset[0]) {
      roleIdByName[r.name] = existing.recordset[0].ID;
    } else {
      const inserted = await pool
        .request()
        .input("name", sql.NVarChar, r.name)
        .input("description", sql.NVarChar, r.description)
        .input("isSystem", sql.Bit, r.isSystem)
        .query(`
          INSERT INTO ${ROLES_TABLE} (NAME, DESCRIPTION, IS_SYSTEM)
          OUTPUT INSERTED.ID
          VALUES (@name, @description, @isSystem)
        `);
      roleIdByName[r.name] = inserted.recordset[0].ID;
    }
  }
  console.log(`OK  seeded roles (Administrator, Standard User)`);

  // 2. Menu tree — upsert every entry from menuSeedData.js by MENU_KEY, two
  //    passes (create-without-parent, then wire up PARENT_ID) since parents
  //    must exist before children can reference them.
  const menuIdByKey = {};
  for (const m of MENU_SEED) {
    const existing = await pool.request().input("key", sql.NVarChar, m.key).query(`
      SELECT ID FROM ${MENUS_TABLE} WHERE MENU_KEY = @key
    `);
    if (existing.recordset[0]) {
      menuIdByKey[m.key] = existing.recordset[0].ID;
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, existing.recordset[0].ID)
        .input("name", sql.NVarChar, m.name)
        .input("displayName", sql.NVarChar, m.displayName || m.name)
        .input("menuType", sql.NVarChar, m.menuType)
        .input("route", sql.NVarChar, m.route || null)
        .input("component", sql.NVarChar, m.component || null)
        .input("icon", sql.NVarChar, m.icon || null)
        .input("order", sql.Int, m.order || 0)
        .query(`
          UPDATE ${MENUS_TABLE}
          SET NAME = @name, DISPLAY_NAME = @displayName, MENU_TYPE = @menuType,
              ROUTE_PATH = @route, COMPONENT_NAME = @component, ICON = @icon,
              DISPLAY_ORDER = @order, UPDATED_AT = SYSUTCDATETIME()
          WHERE ID = @id
        `);
    } else {
      const inserted = await pool
        .request()
        .input("key", sql.NVarChar, m.key)
        .input("name", sql.NVarChar, m.name)
        .input("displayName", sql.NVarChar, m.displayName || m.name)
        .input("menuType", sql.NVarChar, m.menuType)
        .input("route", sql.NVarChar, m.route || null)
        .input("component", sql.NVarChar, m.component || null)
        .input("icon", sql.NVarChar, m.icon || null)
        .input("order", sql.Int, m.order || 0)
        .query(`
          INSERT INTO ${MENUS_TABLE} (MENU_KEY, NAME, DISPLAY_NAME, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
          OUTPUT INSERTED.ID
          VALUES (@key, @name, @displayName, @menuType, @route, @component, @icon, @order)
        `);
      menuIdByKey[m.key] = inserted.recordset[0].ID;
    }
  }
  for (const m of MENU_SEED) {
    if (!m.parentKey) continue;
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, menuIdByKey[m.key])
      .input("parentId", sql.UniqueIdentifier, menuIdByKey[m.parentKey])
      .query(`UPDATE ${MENUS_TABLE} SET PARENT_ID = @parentId WHERE ID = @id`);
  }
  console.log(`OK  seeded menu tree (${MENU_SEED.length} menu items)`);

  // 3. Administrator role gets every menu; Standard User gets none by default.
  for (const key of Object.keys(menuIdByKey)) {
    await pool
      .request()
      .input("roleId", sql.UniqueIdentifier, roleIdByName["Administrator"])
      .input("menuId", sql.UniqueIdentifier, menuIdByKey[key])
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM ${ROLE_MENU_PERMISSIONS_TABLE} WHERE ROLE_ID = @roleId AND MENU_ID = @menuId
        )
        INSERT INTO ${ROLE_MENU_PERMISSIONS_TABLE} (ROLE_ID, MENU_ID, CAN_VIEW) VALUES (@roleId, @menuId, 1)
      `);
  }
  console.log(`OK  granted Administrator role all menus`);

  // 4. Convenience: pre-assign the "Administrator" role to every USER_CODE
  //    listed in ADMIN_USER_CODES (defaults to "ADMIN"), so Role Management
  //    shows a sensible starting point instead of every real admin
  //    appearing as "no role assigned" the first time you open it. This is
  //    purely additive — it never overwrites a role you've already assigned
  //    to someone via the app.
  const adminUserCodes = (process.env.ADMIN_USER_CODES || "ADMIN")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const userCode of adminUserCodes) {
    await pool
      .request()
      .input("userCode", sql.NVarChar, userCode)
      .input("roleId", sql.UniqueIdentifier, roleIdByName["Administrator"])
      .query(`
        IF NOT EXISTS (SELECT 1 FROM ${USER_ROLE_MAP_TABLE} WHERE USER_CODE = @userCode)
        INSERT INTO ${USER_ROLE_MAP_TABLE} (USER_CODE, ROLE_ID) VALUES (@userCode, @roleId)
      `);
  }
  console.log(`OK  pre-assigned Administrator role to: ${adminUserCodes.join(", ")}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
