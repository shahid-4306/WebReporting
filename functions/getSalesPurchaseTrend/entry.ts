import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { runQuery } from "../../shared/sqlServer.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { companyCode, dateFrom, dateTo } = body || {};
    if (!companyCode || !dateFrom || !dateTo) {
      return Response.json({ error: "companyCode, dateFrom and dateTo are required" }, { status: 400 });
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      const access = await base44.asServiceRole.entities.ReportAccess.filter({ user_id: user.id });
      const rec = access[0];
      const allowedCompanies = (rec && rec.allowed_companies) || [];
      if (!allowedCompanies.includes(companyCode)) {
        return Response.json({ error: "You do not have access to this company" }, { status: 403 });
      }
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
    return Response.json({ rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}