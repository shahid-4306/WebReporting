// Local demo backend — used when no real Base44 app is connected
// (i.e. VITE_BASE44_APP_ID is not set, or VITE_DEMO_MODE=true).
//
// This mimics the shape of the real @base44/sdk client (auth, entities,
// functions.invoke, users) closely enough for this app's pages/hooks to
// work end-to-end against fake, in-memory/localStorage-backed data —
// no Base44 account or SQL Server backend required.

const STORAGE_KEY = "demo_backend_state_v1";
const OTP_CODE = "123456"; // fixed demo OTP

// Fixed, documented demo login (see README.md "Demo Mode"):
//   Email:    admin@demo.local
//   Password: demo123   (any password actually works — this is just the
//                         one we document so there's a single answer)
// This account has role "admin", so it sees every sidebar group
// (Accounting / Sales / Purchases) with all reports underneath, plus the
// "User Access" (User Management) page.
const DEMO_ADMIN_EMAIL = "admin@demo.local";
const DEMO_VIEWER_EMAIL = "viewer@demo.local";

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: earlier versions of this demo backend defaulted new
      // accounts to role "user" with no report access, which made every
      // report/sidebar item disappear for anyone who signed in before this
      // fix. Upgrade any such pre-existing account (other than the
      // intentionally-restricted seeded viewer) to "admin" automatically so
      // existing browser sessions self-heal without needing to clear
      // localStorage by hand.
      if (Array.isArray(parsed.users)) {
        parsed.users = parsed.users.map((u) =>
          u.role === "user" && u.email !== DEMO_VIEWER_EMAIL ? { ...u, role: "admin" } : u
        );
      }
      // Migration: menu-based RBAC (roles/menus/rolePermissions) was added
      // after this demo state shape existed — backfill it into any older
      // saved session instead of requiring a localStorage wipe.
      if (!Array.isArray(parsed.roles) || !Array.isArray(parsed.menus) || !parsed.rolePermissions) {
        const seeded = seedRbac();
        parsed.roles = parsed.roles || seeded.roles;
        parsed.menus = parsed.menus || seeded.menus;
        parsed.rolePermissions = parsed.rolePermissions || seeded.rolePermissions;
        parsed.users = (parsed.users || []).map((u) => ({
          ...u,
          role_id: u.role_id || (u.role === "admin" ? "role_admin" : "role_standard"),
        }));
      }
      return parsed;
    }
  } catch (e) {
    /* ignore */
  }
  const seeded = seedRbac();
  return {
    token: null,
    users: [
      { id: "u_admin", email: DEMO_ADMIN_EMAIL, full_name: "Demo Admin", role: "admin", role_id: "role_admin" },
      { id: "u_viewer", email: DEMO_VIEWER_EMAIL, full_name: "Demo Viewer", role: "user", role_id: "role_standard" },
    ],
    reportAccess: [
      {
        id: "ra_viewer",
        user_id: "u_viewer",
        user_email: DEMO_VIEWER_EMAIL,
        allowed_reports: ["general_ledger", "item_wise_sale", "customer_wise_sale"],
        allowed_companies: ["01"],
      },
    ],
    roles: seeded.roles,
    menus: seeded.menus,
    rolePermissions: seeded.rolePermissions,
    pendingRegistration: null,
  };
}

// ---- Menu-Based Role Access Control (RBAC) — demo-mode data ---------------
// Mirrors backend/db/menuSeedData.js: same hierarchy, same keys (menu id ===
// menu_key here since demo mode doesn't need a separate surrogate id), so
// the sidebar/report-access behaviour matches the real backend exactly.
const MENU_SEED = [
  { key: "account", name: "Account", parentKey: null, menuType: "module", order: 10 },
  { key: "accounting", name: "Accounting", parentKey: "account", menuType: "group", order: 10 },
  { key: "general_ledger", name: "General Ledger", parentKey: "accounting", menuType: "item", route: "/reports/general_ledger", icon: "FileText", order: 10 },
  { key: "trial_balance", name: "Trial Balance", parentKey: "accounting", menuType: "item", route: "/reports/trial_balance", icon: "FileText", order: 20 },
  { key: "accounts_receivable", name: "Accounts Receivable", parentKey: "accounting", menuType: "item", route: "/reports/accounts_receivable", icon: "FileText", order: 30 },
  { key: "accounts_payable", name: "Accounts Payable", parentKey: "accounting", menuType: "item", route: "/reports/accounts_payable", icon: "FileText", order: 40 },
  { key: "customer_aging", name: "Customer Aging", parentKey: "accounting", menuType: "item", route: "/reports/customer_aging", icon: "FileText", order: 50 },
  { key: "vendor_aging", name: "Vendor Aging", parentKey: "accounting", menuType: "item", route: "/reports/vendor_aging", icon: "FileText", order: 60 },

  { key: "sales", name: "Sales", parentKey: null, menuType: "group", order: 20 },
  { key: "item_wise_sale", name: "Items Wise Sale", parentKey: "sales", menuType: "item", route: "/reports/item_wise_sale", icon: "FileText", order: 10 },
  { key: "customer_wise_sale", name: "Customer Wise Sale", parentKey: "sales", menuType: "item", route: "/reports/customer_wise_sale", icon: "FileText", order: 20 },
  { key: "top_items_sales", name: "Top Items Sales", parentKey: "sales", menuType: "item", route: "/reports/top_items_sales", icon: "FileText", order: 30 },
  { key: "customer_item_wise_sale", name: "Customer Items Wise Sale", parentKey: "sales", menuType: "item", route: "/reports/customer_item_wise_sale", icon: "FileText", order: 40 },

  { key: "purchases", name: "Purchases", parentKey: null, menuType: "group", order: 30 },
  { key: "item_wise_purchase", name: "Items Wise Purchase", parentKey: "purchases", menuType: "item", route: "/reports/item_wise_purchase", icon: "FileText", order: 10 },
  { key: "vendor_wise_purchase", name: "Vendor Wise Purchase", parentKey: "purchases", menuType: "item", route: "/reports/vendor_wise_purchase", icon: "FileText", order: 20 },

  { key: "administration", name: "Administration", parentKey: null, menuType: "group", order: 40 },
  { key: "user_access", name: "User Access", parentKey: "administration", menuType: "item", route: "/users", icon: "Users", order: 10 },
  { key: "role_management", name: "Role Management", parentKey: "administration", menuType: "item", route: "/roles", icon: "ShieldCheck", order: 20 },
];

function seedRbac() {
  const menus = MENU_SEED.map((m) => ({
    id: m.key,
    menu_key: m.key,
    name: m.name,
    display_name: m.name,
    parent_id: m.parentKey,
    menu_type: m.menuType,
    route_path: m.route || null,
    component_name: null,
    icon: m.icon || null,
    display_order: m.order,
    is_active: true,
  }));
  const roles = [
    { id: "role_admin", name: "Administrator", description: "Full access to every menu.", is_system: true },
    { id: "role_standard", name: "Standard User", description: "No menu access by default — grant menus as needed.", is_system: true },
  ];
  const rolePermissions = {
    role_admin: menus.map((m) => m.id),
    // Matches the pre-existing demo viewer's curated allowed_reports so the
    // seeded demo account behaves the same as before this system existed.
    role_standard: ["general_ledger", "item_wise_sale", "customer_wise_sale"],
  };
  return { menus, roles, rolePermissions };
}

// menuId === menu_key in demo mode, ancestor lookup is just parent_id chase.
function resolveVisibleMenus(allMenus, grantedIds) {
  const byId = new Map(allMenus.map((m) => [m.id, m]));
  const visible = new Set();
  for (const id of grantedIds) {
    let cur = byId.get(id);
    while (cur && cur.is_active) {
      visible.add(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) : null;
    }
  }
  return allMenus.filter((m) => visible.has(m.id));
}

function buildMenuTree(flatMenus) {
  const byId = new Map(flatMenus.map((m) => [m.id, { ...m, children: [] }]));
  const roots = [];
  for (const m of byId.values()) {
    if (m.parent_id && byId.has(m.parent_id)) byId.get(m.parent_id).children.push(m);
    else if (!m.parent_id) roots.push(m);
  }
  const sortRec = (list) => {
    list.sort((a, b) => a.display_order - b.display_order || a.display_name.localeCompare(b.display_name));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* ignore */
  }
}

let state = loadState();
function persist() {
  saveState(state);
}
// Persist immediately in case loadState() just migrated an old session
// (see the role-upgrade migration above) so the fix sticks on next load.
persist();

function currentUser() {
  if (!state.token) return null;
  return state.users.find((u) => u.id === state.token) || null;
}

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

const COMPANIES = [
  { code: "01", name: "Sonex Textiles (Pvt) Ltd" },
  { code: "02", name: "Sonex Trading Co." },
];
const COST_CENTERS = [
  { code: "CC1", name: "Head Office" },
  { code: "CC2", name: "Warehouse" },
  { code: "CC3", name: "Retail Outlet" },
];
const CUSTOMERS = ["Al Karam Traders", "Metro Distributors", "City Textile Mart", "Bright Star Enterprises", "Falcon Traders"];
const VENDORS = ["Zamzam Fabrics", "Prime Yarns Ltd", "Blue Ocean Dyes", "National Packaging", "Star Logistics"];
const ITEMS = ["Cotton Fabric 60\"", "Polyester Blend", "Dyed Yarn Cone", "Printed Lawn", "Denim Roll"];
const ACCOUNTS = ["5010-Sales", "5020-Purchases", "1010-Cash", "1020-Bank", "2010-Payables"];

function money(rng, min, max) {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

function buildLookups(companyCode) {
  const rng = seededRandom(hashSeed(companyCode || "ALL"));
  if (!companyCode) return { companies: COMPANIES, costCenters: [], accounts: [], customers: [], vendors: [], items: [] };
  return {
    companies: COMPANIES,
    costCenters: COST_CENTERS,
    accounts: ACCOUNTS.map((a, i) => ({ code: a.split("-")[0], name: a.split("-")[1] })),
    customers: CUSTOMERS.map((name, i) => ({ code: `C${100 + i}`, name })),
    vendors: VENDORS.map((name, i) => ({ code: `V${100 + i}`, name })),
    items: ITEMS.map((name, i) => ({ code: `I${100 + i}`, name })),
  };
}

function buildDashboardData(params) {
  const rng = seededRandom(hashSeed(`${params.companyCode}-${params.dateFrom}-${params.dateTo}`));
  const totalSales = money(rng, 500000, 3000000);
  const totalPurchases = money(rng, 300000, 2000000);
  const summary = {
    total_sales: totalSales,
    total_purchases: totalPurchases,
    ar_balance: money(rng, 100000, 800000),
    ap_balance: money(rng, 80000, 600000),
  };

  const from = new Date(params.dateFrom);
  const to = new Date(params.dateTo);
  const months = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (months.length === 0) months.push(`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`);
  const trend = [];
  months.forEach((m) => {
    trend.push({ month: m, type: "sale", total: money(rng, 50000, 400000) });
    trend.push({ month: m, type: "purchase", total: money(rng, 30000, 300000) });
  });

  const topItems = ITEMS.map((name, i) => ({
    item_id: `I${100 + i}`,
    item_name: name,
    qty: Math.round(rng() * 500) + 10,
    amount: money(rng, 20000, 300000),
  })).sort((a, b) => b.amount - a.amount);

  const customerSales = CUSTOMERS.map((name, i) => ({
    account_code: `C${100 + i}`,
    name,
    invoices: Math.round(rng() * 40) + 1,
    amount: money(rng, 20000, 300000),
  })).sort((a, b) => b.amount - a.amount);

  const dailyTrend = [];
  const dayCursor = new Date(from);
  let guard = 0;
  while (dayCursor <= to && guard < 120) {
    const day = dayCursor.toISOString().slice(0, 10);
    dailyTrend.push({ day, type: "sale", total: money(rng, 1000, 40000) });
    dailyTrend.push({ day, type: "purchase", total: money(rng, 500, 30000) });
    dayCursor.setDate(dayCursor.getDate() + 1);
    guard++;
  }

  return { cached: false, summary, trend, topItems, customerSales, dailyTrend };
}

function buildReportRows(reportKey, params) {
  const rng = seededRandom(hashSeed(`${reportKey}-${params.companyCode}-${params.dateFrom || params.asOfDate || ""}`));
  const rowCount = 8 + Math.floor(rng() * 8);
  let rows = [];
  let meta = null;

  switch (reportKey) {
    case "general_ledger": {
      let running = money(rng, 10000, 50000);
      meta = {
        account_code: params.accountId || "1010",
        account_name: "Cash",
        opening_balance: running,
        closing_balance: running,
      };
      for (let i = 0; i < rowCount; i++) {
        const debit = rng() > 0.5 ? money(rng, 1000, 50000) : 0;
        const credit = debit ? 0 : money(rng, 1000, 50000);
        running += debit - credit;
        rows.push({
          voucher_date: addDays(params.dateFrom, i),
          voucher_type: rng() > 0.5 ? "JV" : "BPV",
          voucher_no: `V-${1000 + i}`,
          narration: "Sample transaction narration",
          debit,
          credit,
          balance: running,
        });
      }
      meta.closing_balance = running;
      break;
    }
    case "trial_balance": {
      rows = ACCOUNTS.map((a) => {
        const [code, name] = a.split("-");
        const openingDr = money(rng, 0, 50000);
        const periodDr = money(rng, 0, 30000);
        const periodCr = money(rng, 0, 30000);
        return {
          account_code: code,
          account_name: name,
          opening_dr: openingDr,
          opening_cr: 0,
          period_dr: periodDr,
          period_cr: periodCr,
          closing_dr: Math.max(0, openingDr + periodDr - periodCr),
          closing_cr: 0,
        };
      });
      break;
    }
    case "accounts_receivable":
    case "accounts_payable": {
      rows = CUSTOMERS.map((name, i) => {
        const debit = money(rng, 5000, 100000);
        const credit = money(rng, 0, 50000);
        return {
          account_code: `C${100 + i}`,
          account_name: name,
          debit,
          credit,
          balance: debit - credit,
        };
      });
      break;
    }
    case "customer_aging":
    case "vendor_aging": {
      const names = reportKey === "customer_aging" ? CUSTOMERS : VENDORS;
      rows = names.map((name, i) => {
        const buckets = [0, 0, 0, 0, 0, 0, 0].map(() => money(rng, 0, 30000));
        return {
          account_code: `${reportKey === "customer_aging" ? "C" : "V"}${100 + i}`,
          account_name: name,
          "0_30": buckets[0],
          "31_60": buckets[1],
          "61_90": buckets[2],
          "91_120": buckets[3],
          "121_150": buckets[4],
          "151_180": buckets[5],
          "180_plus": buckets[6],
          closing_balance: buckets.reduce((a, b) => a + b, 0),
        };
      });
      break;
    }
    case "item_wise_sale":
    case "item_wise_purchase": {
      rows = ITEMS.map((name, i) => ({
        item_id: `I${100 + i}`,
        item_name: name,
        qty: Math.round(rng() * 500) + 10,
        amount: money(rng, 20000, 300000),
      }));
      break;
    }
    case "customer_wise_sale": {
      rows = CUSTOMERS.map((name, i) => ({
        account_code: `C${100 + i}`,
        name,
        invoices: Math.round(rng() * 40) + 1,
        amount: money(rng, 20000, 300000),
      }));
      break;
    }
    case "top_items_sales": {
      const topN = Number(params.topN) || 10;
      rows = ITEMS.map((name, i) => ({
        item_id: `I${100 + i}`,
        item_name: name,
        qty: Math.round(rng() * 500) + 10,
        amount: money(rng, 20000, 300000),
      }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, topN);
      break;
    }
    case "customer_item_wise_sale": {
      CUSTOMERS.forEach((cname, ci) => {
        ITEMS.slice(0, 2).forEach((iname, ii) => {
          rows.push({
            account_code: `C${100 + ci}`,
            customer_name: cname,
            item_id: `I${100 + ii}`,
            item_name: iname,
            qty: Math.round(rng() * 100) + 5,
            amount: money(rng, 5000, 80000),
          });
        });
      });
      break;
    }
    case "vendor_wise_purchase": {
      rows = VENDORS.map((name, i) => ({
        vendor_code: `V${100 + i}`,
        name,
        invoices: Math.round(rng() * 40) + 1,
        amount: money(rng, 20000, 300000),
      }));
      break;
    }
    default:
      rows = [];
  }

  return { rows, meta };
}

function addDays(dateStr, n) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function demoError(message, status) {
  // Shaped like the real SDK's Base44Error (status directly on the error)
  // plus an axios-style `.response.data.error`, since different pages in
  // this app read the error either way.
  const err = new Error(message);
  err.status = status;
  err.response = { status, data: { error: message } };
  return err;
}

function unauthorized() {
  throw demoError("Unauthorized", 401);
}

// Same shape/semantics as backend/db/roleMenuPermissionsRepo.js's
// getPermittedMenuKeysForUser: null = unrestricted (admin), otherwise the
// Set of MENU_KEYs the user's role has been explicitly granted.
function getPermittedMenuKeys(user) {
  if (!user) return new Set();
  if (user.role === "admin") return null;
  const granted = state.rolePermissions[user.role_id] || [];
  return new Set(granted);
}

export const mockDb = {
  auth: {
    async me() {
      await delay(80);
      const user = currentUser();
      if (!user) unauthorized();
      return user;
    },
    async isAuthenticated() {
      await delay(50);
      return !!currentUser();
    },
    async loginViaUsernamePassword(username /*, password */) {
      await delay(300);
      const needle = String(username || "").trim().toLowerCase();
      let user = state.users.find(
        (u) => u.email.toLowerCase() === needle || u.email.toLowerCase().split("@")[0] === needle
      );
      if (!user) {
        // Any username/password combination signs in successfully in demo
        // mode. New accounts default to "admin" so the whole app (all
        // reports + User Management) works immediately without extra
        // setup. The seeded viewer account (role "user", limited report
        // access) is kept around specifically to demo the permission
        // system — type "viewer" to sign in as them.
        user = { id: `u_${Date.now()}`, email: `${needle || "demo"}@demo.local`, full_name: username, role: "admin", role_id: "role_admin" };
        state.users.push(user);
      }
      state.token = user.id;
      persist();
      return { access_token: user.id, user };
    },
    setToken(token) {
      state.token = token;
      persist();
    },
    logout(returnUrl) {
      state.token = null;
      persist();
      if (returnUrl) window.location.href = returnUrl;
    },
    redirectToLogin(returnTo) {
      const q = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      window.location.href = `/login${q}`;
    },
  },

  entities: {
    User: {
      async list() {
        await delay(150);
        if (!currentUser()) unauthorized();
        return state.users.map(({ id, email, full_name, role, role_id }) => ({
          id,
          username: email,
          email,
          full_name,
          role,
          active: true,
          role_id: role_id || null,
          role_name: state.roles.find((r) => r.id === role_id)?.name,
        }));
      },
    },
    ReportAccess: {
      async list() {
        await delay(150);
        if (!currentUser()) unauthorized();
        return state.reportAccess;
      },
      async filter(query) {
        await delay(120);
        if (!currentUser()) unauthorized();
        return state.reportAccess.filter((r) =>
          Object.entries(query || {}).every(([k, v]) => r[k] === v)
        );
      },
      async create(payload) {
        await delay(150);
        const rec = { id: `ra_${Date.now()}`, ...payload };
        state.reportAccess.push(rec);
        persist();
        return rec;
      },
      async update(id, payload) {
        await delay(150);
        const idx = state.reportAccess.findIndex((r) => r.id === id);
        if (idx >= 0) {
          state.reportAccess[idx] = { ...state.reportAccess[idx], ...payload };
          persist();
          return state.reportAccess[idx];
        }
        return null;
      },
    },
  },

  functions: {
    async invoke(name, params = {}) {
      await delay(350);
      if (!currentUser()) unauthorized();

      if (name === "getLookups") {
        return { data: buildLookups(params.companyCode) };
      }
      if (name === "getDashboardData") {
        if (!params.companyCode || !params.dateFrom || !params.dateTo) {
          throw demoError("companyCode, dateFrom and dateTo are required", 400);
        }
        return { data: buildDashboardData(params) };
      }
      if (name === "runReport") {
        if (!params.report || !params.companyCode) {
          throw demoError("report and companyCode are required", 400);
        }
        const permitted = getPermittedMenuKeys(currentUser());
        if (permitted !== null && !permitted.has(params.report)) {
          throw demoError("You do not have access to this report", 403);
        }
        return { data: buildReportRows(params.report, params) };
      }
      if (name === "getSalesPurchaseTrend") {
        const data = buildDashboardData(params);
        return { data: { rows: data.trend } };
      }
      throw demoError(`Unknown demo function: ${name}`, 404);
    },
  },

  users: {
    async updateRoleId(userId, roleId) {
      await delay(150);
      const user = state.users.find((u) => u.id === userId);
      if (user) {
        user.role_id = roleId || null;
        persist();
      }
      return { ok: true };
    },
    async update(userId, payload) {
      await delay(150);
      const user = state.users.find((u) => u.id === userId);
      if (!user) throw new Error("User not found");
      const { user_name } = payload || {};
      if (user_name !== undefined) {
        if (!String(user_name).trim()) throw new Error("user_name cannot be empty");
        user.full_name = String(user_name).trim();
      }
      // Demo mode has no real password store to update, so user_password is
      // accepted but simply not persisted anywhere here.
      persist();
      return { ok: true, ...user };
    },
    async setActive(userId, active) {
      await delay(150);
      const user = state.users.find((u) => u.id === userId);
      if (!user) throw new Error("User not found");
      if (typeof active !== "boolean") throw new Error("active (boolean) is required");
      if (!active && user.role === "admin") {
        const activeAdmins = state.users.filter((u) => u.role === "admin" && u.active !== false).length;
        if (activeAdmins <= 1) throw new Error("Cannot deactivate the last active admin account");
      }
      user.active = active;
      persist();
      return { ok: true, user_code: userId, active };
    },
  },

  // Menu-Based Role Access Control (RBAC) — demo-mode mirror of
  // backend/routes/menus.routes.js and roles.routes.js.
  menus: {
    async my() {
      await delay(150);
      const user = currentUser();
      if (!user) unauthorized();
      if (user.role === "admin") {
        return buildMenuTree(state.menus.filter((m) => m.is_active));
      }
      const granted = state.rolePermissions[user.role_id] || [];
      const visible = resolveVisibleMenus(state.menus.filter((m) => m.is_active), granted);
      return buildMenuTree(visible);
    },
    async list() {
      await delay(120);
      if (!currentUser()) unauthorized();
      return state.menus;
    },
    async create(payload) {
      await delay(150);
      const rec = {
        id: payload.menu_key,
        menu_key: payload.menu_key,
        name: payload.name,
        display_name: payload.display_name || payload.name,
        parent_id: payload.parent_id || null,
        menu_type: payload.menu_type || "item",
        route_path: payload.route_path || null,
        component_name: payload.component_name || null,
        icon: payload.icon || null,
        display_order: payload.display_order || 0,
        is_active: true,
      };
      state.menus.push(rec);
      persist();
      return rec;
    },
    async update(id, payload) {
      await delay(150);
      const idx = state.menus.findIndex((m) => m.id === id);
      if (idx < 0) return null;
      state.menus[idx] = {
        ...state.menus[idx],
        name: payload.display_name ? state.menus[idx].name : state.menus[idx].name,
        display_name: payload.display_name ?? state.menus[idx].display_name,
        parent_id: payload.parent_id ?? state.menus[idx].parent_id,
        menu_type: payload.menu_type ?? state.menus[idx].menu_type,
        route_path: payload.route_path ?? state.menus[idx].route_path,
        icon: payload.icon ?? state.menus[idx].icon,
        display_order: payload.display_order ?? state.menus[idx].display_order,
        is_active: payload.is_active ?? state.menus[idx].is_active,
      };
      persist();
      return state.menus[idx];
    },
    async remove(id) {
      await delay(120);
      state.menus = state.menus.filter((m) => m.id !== id);
      persist();
      return { ok: true };
    },
  },

  roles: {
    async list() {
      await delay(120);
      if (!currentUser()) unauthorized();
      return state.roles.map((r) => ({ ...r, menu_ids: state.rolePermissions[r.id] || [] }));
    },
    async create(payload) {
      await delay(150);
      const rec = { id: `role_${Date.now()}`, name: payload.name, description: payload.description || "", is_system: false };
      state.roles.push(rec);
      state.rolePermissions[rec.id] = [];
      persist();
      return { ...rec, menu_ids: [] };
    },
    async update(id, payload) {
      await delay(150);
      const role = state.roles.find((r) => r.id === id);
      if (!role) return null;
      role.name = payload.name ?? role.name;
      role.description = payload.description ?? role.description;
      persist();
      return { ...role, menu_ids: state.rolePermissions[id] || [] };
    },
    async remove(id) {
      await delay(120);
      state.roles = state.roles.filter((r) => r.id !== id);
      delete state.rolePermissions[id];
      persist();
      return { ok: true };
    },
    async setPermissions(id, menuIds) {
      await delay(150);
      state.rolePermissions[id] = menuIds || [];
      persist();
      return { ok: true, menu_ids: state.rolePermissions[id] };
    },
  },
};
