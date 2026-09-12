-- ============================================================================
-- Sonex Reporting App — SQL Server (SSMS) setup script
-- ============================================================================
-- This script is a manual/SSMS-runnable equivalent of what `npm run migrate`
-- (backend/db/migrate.js) already does automatically the first time the
-- backend starts. Use it if you'd rather review/run the DDL yourself in
-- SSMS instead of (or before) running the migration script.
--
-- It is idempotent — every CREATE is guarded with IF OBJECT_ID(...) IS NULL
-- and every INSERT with a NOT EXISTS check, so it is safe to run more than
-- once against the same database.
--
-- Table names match the defaults in backend/.env (SQL_ROLES_TABLE,
-- SQL_MENUS_TABLE, SQL_ROLE_MENU_PERMISSIONS_TABLE, SQL_USER_ROLE_MAP_TABLE)
-- and the constants in backend/db/tables.js. If you changed any of those
-- env vars, update the table names below to match before running this.
--
-- IMPORTANT: this script never creates, alters, or writes to your real ERP
-- login table (admin.USERS / SQL_USERS_TABLE — USER_CODE, USER_PASSWORD,
-- ROLE_CODE, ACTIVE, ...). That table already exists and is only ever READ
-- by this app. Everything created below is a brand-new, additive table
-- prefixed APP_ so it can never collide with existing ERP tables in the
-- same `admin` schema.
-- ============================================================================

SET NOCOUNT ON;
GO

-- ----------------------------------------------------------------------------
-- 0. Schema
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'admin')
  EXEC('CREATE SCHEMA admin');
GO

-- ----------------------------------------------------------------------------
-- 0b. Sanity check — confirm the real ERP login table this app authenticates
-- against actually exists with the columns it needs. This does NOT create
-- or modify admin.USERS; it only raises a clear error early if it's missing
-- so you don't discover it later as a confusing runtime login failure.
-- ----------------------------------------------------------------------------
IF OBJECT_ID('admin.USERS', 'U') IS NULL
BEGIN
  RAISERROR('admin.USERS (the real ERP login table) was not found. This script does not create it — verify SQL_USERS_TABLE in backend/.env points at your existing ERP users table (must have USER_CODE, USER_PASSWORD, USER_NAME, ROLE_CODE, ACTIVE columns) before continuing.', 16, 1);
END
GO

-- ----------------------------------------------------------------------------
-- 1. admin.APP_ROLES — Menu-Based RBAC roles (e.g. "Administrator",
--    "Standard User", and any custom roles created from Role Management).
-- ----------------------------------------------------------------------------
IF OBJECT_ID('admin.APP_ROLES', 'U') IS NULL
CREATE TABLE admin.APP_ROLES (
  ID          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_APP_ROLES_ID DEFAULT NEWID() PRIMARY KEY,
  NAME        NVARCHAR(100)    NOT NULL,
  DESCRIPTION NVARCHAR(255)    NULL,
  IS_SYSTEM   BIT              NOT NULL CONSTRAINT DF_APP_ROLES_IS_SYSTEM DEFAULT 0,  -- built-in role; cannot be renamed/deleted
  CREATED_AT  DATETIME2        NOT NULL CONSTRAINT DF_APP_ROLES_CREATED_AT DEFAULT SYSUTCDATETIME(),
  UPDATED_AT  DATETIME2        NOT NULL CONSTRAINT DF_APP_ROLES_UPDATED_AT DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_APP_ROLES_NAME UNIQUE (NAME)
);
GO

-- ----------------------------------------------------------------------------
-- 2. admin.APP_MENUS — the full Menu Master tree (self-referencing via
--    PARENT_ID). A leaf item's ROUTE_PATH/COMPONENT_NAME is what the
--    frontend sidebar links to and renders (e.g. "/users" -> UserManagement,
--    "/roles" -> RoleManagement).
-- ----------------------------------------------------------------------------
IF OBJECT_ID('admin.APP_MENUS', 'U') IS NULL
CREATE TABLE admin.APP_MENUS (
  ID             UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_APP_MENUS_ID DEFAULT NEWID() PRIMARY KEY,
  MENU_KEY       NVARCHAR(100)    NOT NULL,   -- stable machine key (matches report keys for report items)
  NAME           NVARCHAR(150)    NOT NULL,
  DISPLAY_NAME   NVARCHAR(150)    NOT NULL,
  PARENT_ID      UNIQUEIDENTIFIER NULL,
  MENU_TYPE      NVARCHAR(20)     NOT NULL CONSTRAINT DF_APP_MENUS_MENU_TYPE DEFAULT 'item',  -- 'module' | 'group' | 'item'
  ROUTE_PATH     NVARCHAR(255)    NULL,
  COMPONENT_NAME NVARCHAR(150)    NULL,
  ICON           NVARCHAR(100)    NULL,
  DISPLAY_ORDER  INT              NOT NULL CONSTRAINT DF_APP_MENUS_DISPLAY_ORDER DEFAULT 0,
  IS_ACTIVE      BIT              NOT NULL CONSTRAINT DF_APP_MENUS_IS_ACTIVE DEFAULT 1,
  CREATED_AT     DATETIME2        NOT NULL CONSTRAINT DF_APP_MENUS_CREATED_AT DEFAULT SYSUTCDATETIME(),
  UPDATED_AT     DATETIME2        NOT NULL CONSTRAINT DF_APP_MENUS_UPDATED_AT DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_APP_MENUS_MENU_KEY UNIQUE (MENU_KEY),
  CONSTRAINT FK_APP_MENUS_PARENT FOREIGN KEY (PARENT_ID) REFERENCES admin.APP_MENUS(ID)
);
GO

-- ----------------------------------------------------------------------------
-- 3. admin.APP_ROLE_MENU_PERMISSIONS — join table: which menus a role can
--    see (CAN_VIEW = 1). This is what Role Management's checkbox tree reads
--    and writes (PUT /api/roles/:id/permissions).
-- ----------------------------------------------------------------------------
IF OBJECT_ID('admin.APP_ROLE_MENU_PERMISSIONS', 'U') IS NULL
CREATE TABLE admin.APP_ROLE_MENU_PERMISSIONS (
  ID         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_APP_RMP_ID DEFAULT NEWID() PRIMARY KEY,
  ROLE_ID    UNIQUEIDENTIFIER NOT NULL,
  MENU_ID    UNIQUEIDENTIFIER NOT NULL,
  CAN_VIEW   BIT              NOT NULL CONSTRAINT DF_APP_RMP_CAN_VIEW DEFAULT 1,
  CREATED_AT DATETIME2        NOT NULL CONSTRAINT DF_APP_RMP_CREATED_AT DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_APP_RMP_ROLE_MENU UNIQUE (ROLE_ID, MENU_ID),
  CONSTRAINT FK_APP_RMP_ROLE FOREIGN KEY (ROLE_ID) REFERENCES admin.APP_ROLES(ID) ON DELETE CASCADE,
  CONSTRAINT FK_APP_RMP_MENU FOREIGN KEY (MENU_ID) REFERENCES admin.APP_MENUS(ID) ON DELETE CASCADE
);
GO

-- ----------------------------------------------------------------------------
-- 4. admin.APP_USER_ROLE_MAP — bridges a real ERP USER_CODE (admin.USERS)
--    to a Menu-Based RBAC role (admin.APP_ROLES). Kept as its own small,
--    app-owned table keyed by USER_CODE rather than a column on admin.USERS
--    or a UNIQUEIDENTIFIER FK — admin.USERS is never ALTERed by this app,
--    and USER_CODE (not a surrogate GUID) is this app's user id everywhere.
--    This is the table that "Assign Role" (User Access) and new-user
--    creation (with a Role selected) both write to.
-- ----------------------------------------------------------------------------
IF OBJECT_ID('admin.APP_USER_ROLE_MAP', 'U') IS NULL
CREATE TABLE admin.APP_USER_ROLE_MAP (
  USER_CODE  NVARCHAR(50)     NOT NULL PRIMARY KEY,   -- USER_CODE from admin.USERS
  ROLE_ID    UNIQUEIDENTIFIER NOT NULL,
  CREATED_AT DATETIME2        NOT NULL CONSTRAINT DF_APP_URM_CREATED_AT DEFAULT SYSUTCDATETIME(),
  UPDATED_AT DATETIME2        NOT NULL CONSTRAINT DF_APP_URM_UPDATED_AT DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_APP_URM_ROLE FOREIGN KEY (ROLE_ID) REFERENCES admin.APP_ROLES(ID) ON DELETE CASCADE
);
GO

CREATE INDEX IX_APP_USER_ROLE_MAP_ROLE_ID ON admin.APP_USER_ROLE_MAP(ROLE_ID);
GO

-- ----------------------------------------------------------------------------
-- 5. admin.APP_REPORT_ACCESS — per-user allowed-companies list (Company
--    Access section of User Access). Unrelated to roles/menus but included
--    here since it's another app-owned table created by the same migration.
-- ----------------------------------------------------------------------------
-- NOTE: in the real, already-deployed database this table exists with ID as
-- an int identity column and USER_CODE (not USER_ID) as the user-linking
-- column. Reflected here to match backend/db/reportAccessRepo.js and
-- backend/db/migrate.js exactly.
IF OBJECT_ID('admin.APP_REPORT_ACCESS', 'U') IS NULL
CREATE TABLE admin.APP_REPORT_ACCESS (
  ID                INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
  USER_CODE         NVARCHAR(50)     NOT NULL,  -- USER_CODE from admin.USERS
  USER_EMAIL        NVARCHAR(255)    NULL,
  ALLOWED_REPORTS   NVARCHAR(MAX)    NOT NULL CONSTRAINT DF_APP_RA_ALLOWED_REPORTS DEFAULT '[]',    -- JSON array (legacy, unused by Menu-Based RBAC)
  ALLOWED_COMPANIES NVARCHAR(MAX)    NOT NULL CONSTRAINT DF_APP_RA_ALLOWED_COMPANIES DEFAULT '[]',  -- JSON array of company codes
  CREATED_AT        DATETIME2        NOT NULL CONSTRAINT DF_APP_RA_CREATED_AT DEFAULT SYSUTCDATETIME(),
  UPDATED_AT        DATETIME2        NOT NULL CONSTRAINT DF_APP_RA_UPDATED_AT DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_APP_RA_USER_CODE UNIQUE (USER_CODE)
);
GO

-- ----------------------------------------------------------------------------
-- 6. admin.APP_DASHBOARD_CACHE — dashboard summary cache (unrelated to
--    roles/menus; included for completeness/parity with migrate.js).
-- ----------------------------------------------------------------------------
IF OBJECT_ID('admin.APP_DASHBOARD_CACHE', 'U') IS NULL
CREATE TABLE admin.APP_DASHBOARD_CACHE (
  ID                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_APP_DC_ID DEFAULT NEWID() PRIMARY KEY,
  COMPANY_CODE        NVARCHAR(20)     NOT NULL,
  COST_CENTER         NVARCHAR(20)     NOT NULL CONSTRAINT DF_APP_DC_COST_CENTER DEFAULT 'ALL',
  DATE_FROM           DATE             NOT NULL,
  DATE_TO             DATE             NOT NULL,
  SUMMARY_JSON        NVARCHAR(MAX)    NULL,
  TREND_JSON          NVARCHAR(MAX)    NULL,
  DAILY_TREND_JSON    NVARCHAR(MAX)    NULL,
  TOP_ITEMS_JSON      NVARCHAR(MAX)    NULL,
  CUSTOMER_SALES_JSON NVARCHAR(MAX)    NULL,
  CREATED_BY_ID       NVARCHAR(50)     NULL,   -- USER_CODE from admin.USERS
  CREATED_AT          DATETIME2        NOT NULL CONSTRAINT DF_APP_DC_CREATED_AT DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_APP_DC_KEY UNIQUE (COMPANY_CODE, COST_CENTER, DATE_FROM, DATE_TO, CREATED_BY_ID)
);
GO

-- ============================================================================
-- Seed data — default roles
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM admin.APP_ROLES WHERE NAME = 'Administrator')
  INSERT INTO admin.APP_ROLES (NAME, DESCRIPTION, IS_SYSTEM) VALUES ('Administrator', 'Full access to every menu.', 1);
GO

IF NOT EXISTS (SELECT 1 FROM admin.APP_ROLES WHERE NAME = 'Standard User')
  INSERT INTO admin.APP_ROLES (NAME, DESCRIPTION, IS_SYSTEM) VALUES ('Standard User', 'No menu access by default — grant menus as needed.', 1);
GO

-- ============================================================================
-- Seed data — full menu tree (mirrors backend/db/menuSeedData.js exactly;
-- keep the two in sync if you add/rename menu items).
-- ============================================================================

-- ---- Top-level / group nodes (no parent yet) --------------------------------
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'account')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, MENU_TYPE, DISPLAY_ORDER) VALUES ('account', 'Account', 'Account', 'module', 10);
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'sales')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, MENU_TYPE, DISPLAY_ORDER) VALUES ('sales', 'Sales', 'Sales', 'group', 20);
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'purchases')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, MENU_TYPE, DISPLAY_ORDER) VALUES ('purchases', 'Purchases', 'Purchases', 'group', 30);
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'administration')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, MENU_TYPE, DISPLAY_ORDER) VALUES ('administration', 'Administration', 'Administration', 'group', 40);
GO

-- ---- Second-level group (child of 'account') --------------------------------
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, DISPLAY_ORDER)
  SELECT 'accounting', 'Accounting', 'Accounting', ID, 'group', 10 FROM admin.APP_MENUS WHERE MENU_KEY = 'account';
GO

-- ---- Accounting report items -------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'general_ledger')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'general_ledger', 'General Ledger', 'General Ledger', ID, 'item', '/reports/general_ledger', 'ReportPage', 'FileText', 10 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'trial_balance')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'trial_balance', 'Trial Balance', 'Trial Balance', ID, 'item', '/reports/trial_balance', 'ReportPage', 'FileText', 20 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounts_receivable')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'accounts_receivable', 'Accounts Receivable', 'Accounts Receivable', ID, 'item', '/reports/accounts_receivable', 'ReportPage', 'FileText', 30 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounts_payable')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'accounts_payable', 'Accounts Payable', 'Accounts Payable', ID, 'item', '/reports/accounts_payable', 'ReportPage', 'FileText', 40 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'customer_aging')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'customer_aging', 'Customer Aging', 'Customer Aging', ID, 'item', '/reports/customer_aging', 'ReportPage', 'FileText', 50 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'vendor_aging')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'vendor_aging', 'Vendor Aging', 'Vendor Aging', ID, 'item', '/reports/vendor_aging', 'ReportPage', 'FileText', 60 FROM admin.APP_MENUS WHERE MENU_KEY = 'accounting';
GO

-- ---- Sales report items -------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'item_wise_sale')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'item_wise_sale', 'Item Wise Sale', 'Items Wise Sale', ID, 'item', '/reports/item_wise_sale', 'ReportPage', 'FileText', 10 FROM admin.APP_MENUS WHERE MENU_KEY = 'sales';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'customer_wise_sale')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'customer_wise_sale', 'Customer Wise Sale', 'Customer Wise Sale', ID, 'item', '/reports/customer_wise_sale', 'ReportPage', 'FileText', 20 FROM admin.APP_MENUS WHERE MENU_KEY = 'sales';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'top_items_sales')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'top_items_sales', 'Top Items Sales', 'Top Items Sales', ID, 'item', '/reports/top_items_sales', 'ReportPage', 'FileText', 30 FROM admin.APP_MENUS WHERE MENU_KEY = 'sales';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'customer_item_wise_sale')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'customer_item_wise_sale', 'Customer Item Wise Sale', 'Customer Items Wise Sale', ID, 'item', '/reports/customer_item_wise_sale', 'ReportPage', 'FileText', 40 FROM admin.APP_MENUS WHERE MENU_KEY = 'sales';
GO

-- ---- Purchases report items -----------------------------------------------
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'item_wise_purchase')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'item_wise_purchase', 'Item Wise Purchase', 'Items Wise Purchase', ID, 'item', '/reports/item_wise_purchase', 'ReportPage', 'FileText', 10 FROM admin.APP_MENUS WHERE MENU_KEY = 'purchases';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'vendor_wise_purchase')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'vendor_wise_purchase', 'Vendor Wise Purchase', 'Vendor Wise Purchase', ID, 'item', '/reports/vendor_wise_purchase', 'ReportPage', 'FileText', 20 FROM admin.APP_MENUS WHERE MENU_KEY = 'purchases';
GO

-- ---- Administration items: User Access ("Users Access") and Role Management
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'user_access')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'user_access', 'User Access', 'User Access', ID, 'item', '/users', 'UserManagement', 'Users', 10 FROM admin.APP_MENUS WHERE MENU_KEY = 'administration';
IF NOT EXISTS (SELECT 1 FROM admin.APP_MENUS WHERE MENU_KEY = 'role_management')
  INSERT INTO admin.APP_MENUS (MENU_KEY, NAME, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, COMPONENT_NAME, ICON, DISPLAY_ORDER)
  SELECT 'role_management', 'Role Management', 'Role Management', ID, 'item', '/roles', 'RoleManagement', 'ShieldCheck', 20 FROM admin.APP_MENUS WHERE MENU_KEY = 'administration';
GO

-- ============================================================================
-- Grant the "Administrator" role every menu (equivalent to the
-- ADMIN_USER_CODES allow-list's implicit full access — assigning it
-- explicitly too means it shows up correctly, pre-checked, in Role
-- Management).
-- ============================================================================
INSERT INTO admin.APP_ROLE_MENU_PERMISSIONS (ROLE_ID, MENU_ID, CAN_VIEW)
SELECT r.ID, m.ID, 1
FROM admin.APP_MENUS m
CROSS JOIN admin.APP_ROLES r
WHERE r.NAME = 'Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM admin.APP_ROLE_MENU_PERMISSIONS rmp WHERE rmp.ROLE_ID = r.ID AND rmp.MENU_ID = m.ID
  );
GO

-- ============================================================================
-- Pre-assign the "Administrator" RBAC role to the ADMIN_USER_CODES
-- account(s) (defaults to "ADMIN" — matches backend/.env's ADMIN_USER_CODES)
-- so Role Management shows a sensible starting point instead of every real
-- admin appearing as "no role assigned" the first time you open it. Purely
-- additive — it never overwrites a role already assigned to someone.
--
-- If you configured ADMIN_USER_CODES in backend/.env to something other
-- than "ADMIN", also insert those USER_CODE value(s) here.
-- ============================================================================
INSERT INTO admin.APP_USER_ROLE_MAP (USER_CODE, ROLE_ID)
SELECT 'ADMIN', r.ID
FROM admin.APP_ROLES r
WHERE r.NAME = 'Administrator'
  AND NOT EXISTS (SELECT 1 FROM admin.APP_USER_ROLE_MAP WHERE USER_CODE = 'ADMIN');
GO

-- ============================================================================
-- Verification queries — run these after the script to confirm setup
-- ============================================================================

-- Roles
-- SELECT * FROM admin.APP_ROLES ORDER BY IS_SYSTEM DESC, NAME;

-- Full menu tree
-- SELECT ID, MENU_KEY, DISPLAY_NAME, PARENT_ID, MENU_TYPE, ROUTE_PATH, DISPLAY_ORDER FROM admin.APP_MENUS ORDER BY DISPLAY_ORDER;

-- Every user (from the real ERP table) with their assigned Menu-Based RBAC role
-- SELECT u.USER_CODE, u.USER_NAME, u.ACTIVE, r.NAME AS RBAC_ROLE
-- FROM admin.USERS u
-- LEFT JOIN admin.APP_USER_ROLE_MAP urm ON urm.USER_CODE = u.USER_CODE
-- LEFT JOIN admin.APP_ROLES r ON r.ID = urm.ROLE_ID
-- ORDER BY u.USER_CODE;

-- Menus a given role can see (replace the role name as needed)
-- SELECT m.DISPLAY_NAME, m.ROUTE_PATH
-- FROM admin.APP_ROLE_MENU_PERMISSIONS rmp
-- JOIN admin.APP_MENUS m ON m.ID = rmp.MENU_ID
-- JOIN admin.APP_ROLES r ON r.ID = rmp.ROLE_ID
-- WHERE r.NAME = 'Administrator' AND rmp.CAN_VIEW = 1
-- ORDER BY m.DISPLAY_ORDER;

PRINT 'Sonex RBAC schema setup completed successfully.';
GO
