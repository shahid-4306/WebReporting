import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { runMulti } from "../../shared/sqlServer.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = user.role === "admin";
    let allowedCompanies = null;
    if (!isAdmin) {
      const access = await base44.asServiceRole.entities.ReportAccess.filter({ user_id: user.id });
      allowedCompanies = (access[0] && access[0].allowed_companies) || [];
    }

    let body = {};
    try { body = await req.json(); } catch (e) { /* no body */ }
    const companyCode = body && body.companyCode;

    // Run all lookup queries on a single shared connection to avoid opening
    // (and waiting on) a separate pool per query.
    const statements = [
      "SELECT COMPANY_CODE AS code, COMPANY_NAME AS name FROM admin.COMPANY ORDER BY COMPANY_CODE",
    ];
    if (companyCode) {
      statements.push(
        "SELECT GROUP_CODE AS code, GROUP_NAME AS name FROM admin.COST_CENTRE WHERE COMPANY_CODE=@companyCode ORDER BY GROUP_CODE",
        "SELECT ACCOUNT_CODE AS code, ACCOUNT_NAME AS name FROM admin.CHART WHERE COMPANY_CODE=@companyCode AND (ACTIVE IS NULL OR ACTIVE='1') AND LEVEL_NO=5 ORDER BY ACCOUNT_CODE",
        "SELECT ACCOUNT_CODE AS code, ACCOUNT_NAME AS name FROM admin.CHART WHERE COMPANY_CODE=@companyCode AND ACCOUNT_CATEGORY='S' AND LEVEL_NO=5 AND (ACTIVE IS NULL OR ACTIVE='1') ORDER BY ACCOUNT_CODE",
        "SELECT ACCOUNT_CODE AS code, ACCOUNT_NAME AS name FROM admin.CHART WHERE COMPANY_CODE=@companyCode AND ACCOUNT_CATEGORY='V' AND LEVEL_NO=5 AND (ACTIVE IS NULL OR ACTIVE='1') ORDER BY ACCOUNT_CODE",
        // Items: derive the distinct list from the sales detail table but
        // restrict to recent invoices (last 2 years) so the DISTINCT scan
        // stays bounded on large transactional tables.
        "SELECT DISTINCT d.ITEM_ID AS code, d.ITEM_NAME AS name FROM admin.SALE_INVOICE_DETAIL d JOIN admin.SALE_INVOICE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO WHERE d.COMPANY_CODE=@companyCode AND h.DOCUMENT_DATE >= DATEADD(year,-2,GETDATE()) ORDER BY d.ITEM_ID"
      );
    }

    const inputs = companyCode ? { companyCode } : {};
    const results = await runMulti(statements, inputs);
    const companies = results[0] || [];
    const filteredCompanies = (!isAdmin && allowedCompanies)
      ? companies.filter((c) => allowedCompanies.includes(c.code))
      : companies;

    let costCenters = [];
    let accounts = [];
    let customers = [];
    let vendors = [];
    let items = [];
    if (companyCode) {
      costCenters = results[1] || [];
      accounts = results[2] || [];
      customers = results[3] || [];
      vendors = results[4] || [];
      items = results[5] || [];
    }

    return Response.json({ companies: filteredCompanies, costCenters, accounts, customers, vendors, items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}