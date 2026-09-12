import { getPool, sql } from "./pool.js";
import { DASHBOARD_CACHE_TABLE } from "./tables.js";

function mapRow(r) {
  if (!r) return null;
  return {
    summary: JSON.parse(r.SUMMARY_JSON || "{}"),
    trend: JSON.parse(r.TREND_JSON || "[]"),
    dailyTrend: JSON.parse(r.DAILY_TREND_JSON || "[]"),
    topItems: JSON.parse(r.TOP_ITEMS_JSON || "[]"),
    customerSales: JSON.parse(r.CUSTOMER_SALES_JSON || "[]"),
  };
}

export async function find({ userId, companyCode, costCenter, dateFrom, dateTo }) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("userId", sql.NVarChar, userId)
    .input("companyCode", sql.NVarChar, companyCode)
    .input("costCenter", sql.NVarChar, costCenter)
    .input("dateFrom", sql.Date, dateFrom)
    .input("dateTo", sql.Date, dateTo)
    .query(`
      SELECT TOP 1 * FROM ${DASHBOARD_CACHE_TABLE}
      WHERE CREATED_BY_ID = @userId AND COMPANY_CODE = @companyCode AND COST_CENTER = @costCenter
        AND DATE_FROM = @dateFrom AND DATE_TO = @dateTo
    `);
  return mapRow(res.recordset[0]);
}

export async function upsert({ userId, companyCode, costCenter, dateFrom, dateTo, data }) {
  const pool = await getPool();

  async function runMerge() {
    await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .input("companyCode", sql.NVarChar, companyCode)
      .input("costCenter", sql.NVarChar, costCenter)
      .input("dateFrom", sql.Date, dateFrom)
      .input("dateTo", sql.Date, dateTo)
      .input("summary", sql.NVarChar, JSON.stringify(data.summary || {}))
      .input("trend", sql.NVarChar, JSON.stringify(data.trend || []))
      .input("dailyTrend", sql.NVarChar, JSON.stringify(data.dailyTrend || []))
      .input("topItems", sql.NVarChar, JSON.stringify(data.topItems || []))
      .input("customerSales", sql.NVarChar, JSON.stringify(data.customerSales || []))
      .query(`
        MERGE ${DASHBOARD_CACHE_TABLE} WITH (HOLDLOCK) AS target
        USING (SELECT @companyCode AS COMPANY_CODE, @costCenter AS COST_CENTER, @dateFrom AS DATE_FROM, @dateTo AS DATE_TO, @userId AS CREATED_BY_ID) AS src
          ON target.COMPANY_CODE = src.COMPANY_CODE AND target.COST_CENTER = src.COST_CENTER
             AND target.DATE_FROM = src.DATE_FROM AND target.DATE_TO = src.DATE_TO
             AND (target.CREATED_BY_ID = src.CREATED_BY_ID OR (target.CREATED_BY_ID IS NULL AND src.CREATED_BY_ID IS NULL))
        WHEN MATCHED THEN
          UPDATE SET SUMMARY_JSON=@summary, TREND_JSON=@trend, DAILY_TREND_JSON=@dailyTrend,
                     TOP_ITEMS_JSON=@topItems, CUSTOMER_SALES_JSON=@customerSales, CREATED_AT=SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (COMPANY_CODE, COST_CENTER, DATE_FROM, DATE_TO, SUMMARY_JSON, TREND_JSON, DAILY_TREND_JSON, TOP_ITEMS_JSON, CUSTOMER_SALES_JSON, CREATED_BY_ID)
          VALUES (@companyCode, @costCenter, @dateFrom, @dateTo, @summary, @trend, @dailyTrend, @topItems, @customerSales, @userId);
      `);
  }

  try {
    // WITH (HOLDLOCK) above serializes MERGE against itself for this table,
    // which is the standard fix for the well-known MERGE race condition
    // (two near-simultaneous requests for the exact same cache key both
    // seeing "not matched" and both trying to INSERT -> unique key
    // violation). Belt-and-braces: if a violation still slips through
    // (e.g. under very high concurrency, or a stale cache row left over
    // from before CREATED_BY_ID was tracked), retry once as a plain
    // UPDATE instead of surfacing a hard crash to the user.
    await runMerge();
  } catch (err) {
    const isDuplicateKey = err && (err.number === 2627 || err.number === 2601);
    if (!isDuplicateKey) throw err;

    console.warn(
      `⚠️ dashboardCache.upsert: retrying as UPDATE after unique key conflict for ` +
        `(${companyCode}, ${costCenter}, ${dateFrom}, ${dateTo}, ${userId ?? "NULL"})`
    );

    await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .input("companyCode", sql.NVarChar, companyCode)
      .input("costCenter", sql.NVarChar, costCenter)
      .input("dateFrom", sql.Date, dateFrom)
      .input("dateTo", sql.Date, dateTo)
      .input("summary", sql.NVarChar, JSON.stringify(data.summary || {}))
      .input("trend", sql.NVarChar, JSON.stringify(data.trend || []))
      .input("dailyTrend", sql.NVarChar, JSON.stringify(data.dailyTrend || []))
      .input("topItems", sql.NVarChar, JSON.stringify(data.topItems || []))
      .input("customerSales", sql.NVarChar, JSON.stringify(data.customerSales || []))
      .query(`
        UPDATE ${DASHBOARD_CACHE_TABLE}
        SET SUMMARY_JSON=@summary, TREND_JSON=@trend, DAILY_TREND_JSON=@dailyTrend,
            TOP_ITEMS_JSON=@topItems, CUSTOMER_SALES_JSON=@customerSales, CREATED_AT=SYSUTCDATETIME()
        WHERE COMPANY_CODE=@companyCode AND COST_CENTER=@costCenter
          AND DATE_FROM=@dateFrom AND DATE_TO=@dateTo
          AND (CREATED_BY_ID = @userId OR (CREATED_BY_ID IS NULL AND @userId IS NULL))
      `);
  }
}
