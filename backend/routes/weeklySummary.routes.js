import express from "express";
import { runQuery } from "../db/pool.js";
import { sendMail } from "../utils/mailer.js";
import { verifySessionToken } from "../utils/authTokens.js";
import { findById } from "../db/usersRepo.js";

const router = express.Router();

function fmt(n) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function iso(d) {
  return d.toISOString().slice(0, 10);
}
function weekRange() {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  to.setDate(to.getDate() - 1); // yesterday (Sunday if run Monday)
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

// POST /api/weekly-summary-email?token=WEEKLY_SUMMARY_TOKEN
// Two ways to trigger, same as before:
//   1. An external scheduler (cron / Windows Task Scheduler / cron-job.org)
//      calling this URL with ?token=<WEEKLY_SUMMARY_TOKEN env var>.
//   2. A signed-in admin, manually, with a normal Bearer session token.
router.post("/", async (req, res) => {
  try {
    const webhookToken = process.env.WEEKLY_SUMMARY_TOKEN;
    const suppliedToken = req.query.token;
    let authorized = !!webhookToken && suppliedToken === webhookToken;

    if (!authorized) {
      const header = req.headers.authorization || "";
      const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!bearer) return res.status(401).json({ error: "Unauthorized" });
      const payload = verifySessionToken(bearer);
      const user = await findById(payload.sub);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
      authorized = true;
    }

    const { dateFrom, dateTo } = weekRange();
    const rows = await runQuery(SUMMARY_SQL, { dateFrom, dateTo });

    const totalSales = rows.reduce((s, r) => s + (Number(r.total_sales) || 0), 0);
    const totalPurchases = rows.reduce((s, r) => s + (Number(r.total_purchases) || 0), 0);

    const bodyRows = rows
      .map(
        (r) =>
          `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb">${r.company_code} - ${r.company_name}</td>` +
          `<td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(r.total_sales)}</td>` +
          `<td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(r.total_purchases)}</td></tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827">
        <h2 style="margin-bottom:4px">Weekly Sales &amp; Purchase Summary</h2>
        <p style="margin-top:0;color:#6b7280">Period: ${dateFrom} to ${dateTo}</p>
        <table style="border-collapse:collapse;font-size:14px">
          <thead><tr style="background:#f3f4f6">
            <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Company</th>
            <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">Sales</th>
            <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">Purchases</th>
          </tr></thead>
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
    // The real ERP login table has no EMAIL column, so recipients can't be
    // derived from admin.USERS anymore — configure them explicitly instead.
    const recipients = (process.env.WEEKLY_SUMMARY_RECIPIENTS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const to of recipients) {
      await sendMail({ to, subject, html, text: `Weekly summary ${dateFrom} to ${dateTo}: sales ${fmt(totalSales)}, purchases ${fmt(totalPurchases)}` });
    }

    res.json({ ok: true, sent: recipients.length, recipients, dateFrom, dateTo, totalSales, totalPurchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
