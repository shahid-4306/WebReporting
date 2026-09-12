import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { runQuery } from "../../shared/sqlServer.ts";

// Scheduled (Monday morning) summary of the previous week's sales and
// purchase totals, emailed to the management team (all admin users).

function fmt(n) {
  return (Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}

// Previous week (Mon–Sun) ending yesterday.
function weekRange() {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  to.setDate(to.getDate() - 1); // Sunday
  const from = new Date(to);
  from.setDate(from.getDate() - 6); // Monday
  return { dateFrom: iso(from), dateTo: iso(to) };
}

const SUMMARY_SQL = `
  SELECT c.COMPANY_CODE AS company_code, c.COMPANY_NAME AS company_name,
    ISNULL(s.total_sales, 0) AS total_sales,
    ISNULL(p.total_purchases, 0) AS total_purchases
  FROM admin.COMPANY c
  LEFT JOIN (
    SELECT COMPANY_CODE, SUM(ISNULL(TOTAL_AMOUNT,0)) AS total_sales
    FROM admin.SALE_INVOICE_HEADER
    WHERE DOCUMENT_DATE >= @dateFrom AND DOCUMENT_DATE < DATEADD(day,1,@dateTo)
    GROUP BY COMPANY_CODE
  ) s ON s.COMPANY_CODE = c.COMPANY_CODE
  LEFT JOIN (
    SELECT COMPANY_CODE, SUM(ISNULL(TOTAL_AMOUNT,0)) AS total_purchases
    FROM admin.PURCHASE_HEADER
    WHERE DOCUMENT_DATE >= @dateFrom AND DOCUMENT_DATE < DATEADD(day,1,@dateTo)
    GROUP BY COMPANY_CODE
  ) p ON p.COMPANY_CODE = c.COMPANY_CODE
  ORDER BY c.COMPANY_CODE
`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const webhookToken = secrets.get("WEEKLY_SUMMARY_TOKEN");
    // Allow an external scheduler to trigger via a shared secret; otherwise
    // require an authenticated admin (manual run from the app).
    if (!webhookToken || token !== webhookToken) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role !== "admin")
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { dateFrom, dateTo } = weekRange();
    const rows = await runQuery(SUMMARY_SQL, { dateFrom, dateTo });

    const totalSales = rows.reduce((s, r) => s + (Number(r.total_sales) || 0), 0);
    const totalPurchases = rows.reduce((s, r) => s + (Number(r.total_purchases) || 0), 0);

    const bodyRows = rows
      .map(
        (r) =>
          `<tr>` +
          `<td style="padding:6px 12px;border:1px solid #e5e7eb">${r.company_code} - ${r.company_name}</td>` +
          `<td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(r.total_sales)}</td>` +
          `<td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(r.total_purchases)}</td>` +
          `</tr>`
      )
      .join("");

    const body = `
      <div style="font-family:Arial,sans-serif;color:#111827">
        <h2 style="margin-bottom:4px">Weekly Sales &amp; Purchase Summary</h2>
        <p style="margin-top:0;color:#6b7280">Period: ${dateFrom} to ${dateTo}</p>
        <table style="border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Company</th>
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">Sales</th>
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">Purchases</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
            <tr style="font-weight:bold;background:#f9fafb">
              <td style="padding:6px 12px;border:1px solid #e5e7eb">Total</td>
              <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(totalSales)}</td>
              <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(totalPurchases)}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:16px;color:#6b7280;font-size:12px">Sent automatically by Sonex Insight ERP.</p>
      </div>`;

    const subject = `Weekly Sales & Purchase Summary (${dateFrom} to ${dateTo})`;

    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter((u) => u.role === "admin" && u.email);

    let sent = 0;
    for (const a of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: a.email,
        subject,
        body,
        from_name: "Sonex Insight ERP",
      });
      sent++;
    }

    return Response.json({
      ok: true,
      sent,
      recipients: admins.map((a) => a.email),
      dateFrom,
      dateTo,
      totalSales,
      totalPurchases,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}