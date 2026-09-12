import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { runQuery, runMulti } from "../db/pool.js";
import * as reportAccess from "../db/reportAccessRepo.js";
import * as dashboardCache from "../db/dashboardCacheRepo.js";
import { fetchDashboardData } from "../shared/dashboardQueries.js";
import { buildReport } from "../shared/reportQueries.js";
import { getPermittedMenuKeysForUser } from "../db/roleMenuPermissionsRepo.js";

const router = express.Router();
router.use(requireAuth);

// Report/menu access now comes from the Menu-Based RBAC system (the user's
// Role -> ROLE_MENU_PERMISSIONS -> MENU_KEY), not from a per-user JSON blob
// — this is the backend enforcement side of the dynamic sidebar, so hiding
// a report in the UI is never the only thing stopping an unauthorized
// runReport call. Company-level scoping (allowedCompanies) is a separate,
// pre-existing concern and is left exactly as it was, still sourced from
// admin.REPORT_ACCESS.
async function getAccessRecord(user) {
  if (user.role === "admin") return null; // null = unrestricted
  const [permittedMenuKeys, rec] = await Promise.all([
    getPermittedMenuKeysForUser(user),
    reportAccess.findByUserId(user.id),
  ]);
  return {
    allowedReports: permittedMenuKeys, // Set of MENU_KEY, or null for admins (handled above)
    allowedCompanies: rec?.allowed_companies || [],
  };
}

// POST /api/functions/getLookups  { companyCode? }
router.post("/getLookups", async (req, res) => {
  try {
    const access = await getAccessRecord(req.user);
    const { companyCode } = req.body || {};

    const statements = ["SELECT COMPANY_CODE AS code, COMPANY_NAME AS name FROM admin.COMPANY ORDER BY COMPANY_CODE"];
    if (companyCode) {
      statements.push(
        "SELECT GROUP_CODE AS code, GROUP_NAME AS name FROM admin.COST_CENTRE WHERE COMPANY_CODE=@companyCode ORDER BY GROUP_CODE",
        "SELECT ACCOUNT_CODE AS code, ACCOUNT_NAME AS name FROM admin.CHART WHERE COMPANY_CODE=@companyCode AND (ACTIVE IS NULL OR ACTIVE='1') AND LEVEL_NO=5 ORDER BY ACCOUNT_CODE",
        "SELECT ACCOUNT_CODE AS code, ACCOUNT_NAME AS name FROM admin.CHART WHERE COMPANY_CODE=@companyCode AND ACCOUNT_CATEGORY='S' AND LEVEL_NO=5 AND (ACTIVE IS NULL OR ACTIVE='1') ORDER BY ACCOUNT_CODE",
        "SELECT ACCOUNT_CODE AS code, ACCOUNT_NAME AS name FROM admin.CHART WHERE COMPANY_CODE=@companyCode AND ACCOUNT_CATEGORY='V' AND LEVEL_NO=5 AND (ACTIVE IS NULL OR ACTIVE='1') ORDER BY ACCOUNT_CODE",
        "SELECT DISTINCT d.ITEM_ID AS code, d.ITEM_NAME AS name FROM admin.SALE_INVOICE_DETAIL d JOIN admin.SALE_INVOICE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO WHERE d.COMPANY_CODE=@companyCode AND h.DOCUMENT_DATE >= DATEADD(year,-2,GETDATE()) ORDER BY d.ITEM_ID"
      );
    }
    const inputs = companyCode ? { companyCode } : {};
    const results = await runMulti(statements, inputs);
    const companies = results[0] || [];
    const filteredCompanies = access ? companies.filter((c) => access.allowedCompanies.includes(c.code)) : companies;

    res.json({
      data: {
        companies: filteredCompanies,
        costCenters: companyCode ? results[1] || [] : [],
        accounts: companyCode ? results[2] || [] : [],
        customers: companyCode ? results[3] || [] : [],
        vendors: companyCode ? results[4] || [] : [],
        items: companyCode ? results[5] || [] : [],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/functions/getDashboardData  { companyCode, dateFrom, dateTo, costCenter?, refresh? }
router.post("/getDashboardData", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { companyCode, dateFrom, dateTo, costCenter, refresh } = req.body || {};
    if (!companyCode || !dateFrom || !dateTo) {
      return res.status(400).json({ error: "companyCode, dateFrom and dateTo are required" });
    }
    const cc = costCenter || "ALL";

    const access = await getAccessRecord(req.user);
    if (access && !access.allowedCompanies.includes(companyCode)) {
      return res.status(403).json({ error: "You do not have access to this company" });
    }

    if (!refresh) {
      const cached = await dashboardCache.find({ userId: req.user.id, companyCode, costCenter: cc, dateFrom, dateTo });
      if (cached) return res.json({ cached: true, ...cached });
    }

    const data = await fetchDashboardData({ companyCode, dateFrom, dateTo, cc });
    await dashboardCache.upsert({ userId: req.user.id, companyCode, costCenter: cc, dateFrom, dateTo, data });

    res.json({ cached: false, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/functions/getSalesPurchaseTrend  { companyCode, dateFrom, dateTo }
router.post("/getSalesPurchaseTrend", async (req, res) => {
  try {
    const { companyCode, dateFrom, dateTo } = req.body || {};
    if (!companyCode || !dateFrom || !dateTo) {
      return res.status(400).json({ error: "companyCode, dateFrom and dateTo are required" });
    }
    const access = await getAccessRecord(req.user);
    if (access && !access.allowedCompanies.includes(companyCode)) {
      return res.status(403).json({ error: "You do not have access to this company" });
    }

    const sql = `
      SELECT FORMAT(h.DOCUMENT_DATE, 'yyyy-MM') AS month, 'sale' AS type, SUM(ISNULL(h.TOTAL_AMOUNT,0)) AS total
      FROM admin.SALE_INVOICE_HEADER h
      WHERE h.COMPANY_CODE=@companyCode
        AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      GROUP BY FORMAT(h.DOCUMENT_DATE, 'yyyy-MM')
      UNION ALL
      SELECT FORMAT(p.DOCUMENT_DATE, 'yyyy-MM') AS month, 'purchase' AS type, SUM(ISNULL(p.TOTAL_AMOUNT,0)) AS total
      FROM admin.PURCHASE_HEADER p
      WHERE p.COMPANY_CODE=@companyCode
        AND p.DOCUMENT_DATE >= @dateFrom AND p.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      GROUP BY FORMAT(p.DOCUMENT_DATE, 'yyyy-MM')
      ORDER BY month, type
    `;
    const rows = await runQuery(sql, { companyCode, dateFrom, dateTo });
    res.json({ data: { rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/functions/runReport  { report, companyCode, ...filters }
router.post("/runReport", async (req, res) => {
  try {
    const body = req.body || {};
    const { report, companyCode } = body;
    if (!report || !companyCode) return res.status(400).json({ error: "report and companyCode are required" });

    const access = await getAccessRecord(req.user);
    if (access) {
      if (!access.allowedReports.has(report)) return res.status(403).json({ error: "You do not have access to this report" });
      if (!access.allowedCompanies.includes(companyCode)) return res.status(403).json({ error: "You do not have access to this company" });
    }

    const built = buildReport(report, {
      companyCode,
      costCenter: body.costCenter || "ALL",
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      accountId: body.accountId || "",
      topN: body.topN || 10,
      customerId: body.customerId || "",
      itemId: body.itemId || "",
      customerFrom: body.customerFrom || "",
      customerTo: body.customerTo || "",
      itemFrom: body.itemFrom || "",
      itemTo: body.itemTo || "",
      vendorFrom: body.vendorFrom || "",
      vendorTo: body.vendorTo || "",
      accountFrom: body.accountFrom || "",
      accountTo: body.accountTo || "",
    });

    const rows = await runQuery(built.sql, built.params);
    let meta = null;
    if (built.metaSql) {
      const metaRows = await runQuery(built.metaSql, built.params);
      meta = metaRows[0] || null;
    }
    res.json({ data: { rows, meta } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
