import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { fetchDashboardData } from "../../shared/dashboardQueries.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { companyCode, dateFrom, dateTo, costCenter, refresh } = body || {};
    if (!companyCode || !dateFrom || !dateTo) {
      return Response.json({ error: "companyCode, dateFrom and dateTo are required" }, { status: 400 });
    }
    const cc = costCenter || "ALL";

    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      const access = await base44.asServiceRole.entities.ReportAccess.filter({ user_id: user.id });
      const rec = access[0];
      const allowedCompanies = (rec && rec.allowed_companies) || [];
      if (!allowedCompanies.includes(companyCode)) {
        return Response.json({ error: "You do not have access to this company" }, { status: 403 });
      }
    }

    // Serve from cache unless an explicit refresh is requested
    if (!refresh) {
      const cached = await base44.entities.DashboardCache.filter({
        company_code: companyCode,
        cost_center: cc,
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (cached[0]) {
        const c = cached[0];
        return Response.json({
          cached: true,
          summary: c.summary,
          trend: c.trend,
          topItems: c.top_items,
          customerSales: c.customer_sales,
          dailyTrend: c.daily_trend,
        });
      }
    }

    // Fetch fresh from SQL Server and persist to the dump table
    const data = await fetchDashboardData({ companyCode, dateFrom, dateTo, cc });

    const existing = await base44.entities.DashboardCache.filter({
      company_code: companyCode,
      cost_center: cc,
      date_from: dateFrom,
      date_to: dateTo,
    });
    const payload = {
      company_code: companyCode,
      cost_center: cc,
      date_from: dateFrom,
      date_to: dateTo,
      summary: data.summary,
      trend: data.trend,
      top_items: data.topItems,
      customer_sales: data.customerSales,
      daily_trend: data.dailyTrend,
    };
    if (existing[0]) {
      await base44.entities.DashboardCache.update(existing[0].id, payload);
    } else {
      await base44.entities.DashboardCache.create(payload);
    }

    return Response.json({ cached: false, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}