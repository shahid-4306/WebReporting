import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { runQuery } from "../../shared/sqlServer.ts";
import { buildReport } from "../../shared/reportQueries.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { report, companyCode, costCenter, dateFrom, dateTo, accountId, topN, customerId, itemId, customerFrom, customerTo, itemFrom, itemTo, vendorFrom, vendorTo, accountFrom, accountTo } = body || {};
    if (!report || !companyCode) {
      return Response.json({ error: "report and companyCode are required" }, { status: 400 });
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      const access = await base44.asServiceRole.entities.ReportAccess.filter({ user_id: user.id });
      const rec = access[0];
      const allowedReports = (rec && rec.allowed_reports) || [];
      const allowedCompanies = (rec && rec.allowed_companies) || [];
      if (!allowedReports.includes(report)) {
        return Response.json({ error: "You do not have access to this report" }, { status: 403 });
      }
      if (!allowedCompanies.includes(companyCode)) {
        return Response.json({ error: "You do not have access to this company" }, { status: 403 });
      }
    }

    const built = buildReport(report, {
      companyCode,
      costCenter: costCenter || "ALL",
      dateFrom,
      dateTo,
      accountId: accountId || "",
      topN: topN || 10,
      customerId: customerId || "",
      itemId: itemId || "",
      customerFrom: customerFrom || "",
      customerTo: customerTo || "",
      itemFrom: itemFrom || "",
      itemTo: itemTo || "",
      vendorFrom: vendorFrom || "",
      vendorTo: vendorTo || "",
      accountFrom: accountFrom || "",
      accountTo: accountTo || "",
    });

    const rows = await runQuery(built.sql, built.params);
    let meta = null;
    if (built.metaSql) {
      const metaRows = await runQuery(built.metaSql, built.params);
      meta = metaRows[0] || null;
    }
    return Response.json({ rows, meta });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}