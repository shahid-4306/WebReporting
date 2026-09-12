import { runQuery, runMulti } from "./sqlServer.ts";

export async function fetchDashboardData(params: { companyCode: string; dateFrom: string; dateTo: string; cc: string }) {
  const summarySql = `
    SELECT
      (SELECT ISNULL(SUM(ISNULL(h.TOTAL_AMOUNT,0)),0)
         FROM admin.SALE_INVOICE_HEADER h
         WHERE h.COMPANY_CODE=@companyCode
           AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
           AND (@cc='ALL' OR h.GROUP_CODE=@cc)) AS total_sales,
      (SELECT ISNULL(SUM(ISNULL(p.TOTAL_AMOUNT,0)),0)
         FROM admin.PURCHASE_HEADER p
         WHERE p.COMPANY_CODE=@companyCode
           AND p.DOCUMENT_DATE >= @dateFrom AND p.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
           AND (@cc='ALL' OR p.GROUP_CODE=@cc)) AS total_purchases,
      (SELECT ISNULL(SUM((ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0))-(ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0))),0)
         FROM admin.CHART c
         LEFT JOIN (
           SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS dr, SUM(ISNULL(va.CREDIT,0)) AS cr
           FROM admin.VOUCHER_ACCOUNT va
           JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
           WHERE v.COMPANY_CODE=@companyCode AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
             AND (@cc='ALL' OR va.GROUP_CODE=@cc)
           GROUP BY va.ACCOUNT_CODE
         ) m ON m.ACCOUNT_CODE=c.ACCOUNT_CODE
         WHERE c.COMPANY_CODE=@companyCode AND c.ACCOUNT_CATEGORY='S' AND c.LEVEL_NO=5
           AND (ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0))-(ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0)) > 0) AS ar_balance,
      (SELECT ISNULL(SUM((ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0))-(ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0))),0)
         FROM admin.CHART c
         LEFT JOIN (
           SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS dr, SUM(ISNULL(va.CREDIT,0)) AS cr
           FROM admin.VOUCHER_ACCOUNT va
           JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
           WHERE v.COMPANY_CODE=@companyCode AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
             AND (@cc='ALL' OR va.GROUP_CODE=@cc)
           GROUP BY va.ACCOUNT_CODE
         ) m ON m.ACCOUNT_CODE=c.ACCOUNT_CODE
         WHERE c.COMPANY_CODE=@companyCode AND c.ACCOUNT_CATEGORY='V' AND c.LEVEL_NO=5
           AND (ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0))-(ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0)) > 0) AS ap_balance
  `;

  const trendSql = `
    SELECT FORMAT(h.DOCUMENT_DATE, 'yyyy-MM') AS month, 'sale' AS type, SUM(ISNULL(h.TOTAL_AMOUNT,0)) AS total
    FROM admin.SALE_INVOICE_HEADER h
    WHERE h.COMPANY_CODE=@companyCode
      AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      AND (@cc='ALL' OR h.GROUP_CODE=@cc)
    GROUP BY FORMAT(h.DOCUMENT_DATE, 'yyyy-MM')
    UNION ALL
    SELECT FORMAT(p.DOCUMENT_DATE, 'yyyy-MM') AS month, 'purchase' AS type, SUM(ISNULL(p.TOTAL_AMOUNT,0)) AS total
    FROM admin.PURCHASE_HEADER p
    WHERE p.COMPANY_CODE=@companyCode
      AND p.DOCUMENT_DATE >= @dateFrom AND p.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      AND (@cc='ALL' OR p.GROUP_CODE=@cc)
    GROUP BY FORMAT(p.DOCUMENT_DATE, 'yyyy-MM')
    ORDER BY month, type
  `;

  const topItemsSql = `
    SELECT TOP 10 d.ITEM_ID AS item_id, d.ITEM_NAME AS item_name,
         SUM(ISNULL(d.QUANTITY,0)) AS qty, SUM(ISNULL(d.AMOUNT,0)) AS amount
    FROM admin.SALE_INVOICE_DETAIL d
    JOIN admin.SALE_INVOICE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO
    WHERE h.COMPANY_CODE=@companyCode
      AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      AND (@cc='ALL' OR h.GROUP_CODE=@cc)
    GROUP BY d.ITEM_ID, d.ITEM_NAME
    ORDER BY amount DESC
  `;

  const customerSql = `
    SELECT TOP 10 h.ACCOUNT_CODE AS account_code, h.NAME AS name,
         COUNT(*) AS invoices, SUM(ISNULL(h.TOTAL_AMOUNT,0)) AS amount
    FROM admin.SALE_INVOICE_HEADER h
    WHERE h.COMPANY_CODE=@companyCode
      AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      AND (@cc='ALL' OR h.GROUP_CODE=@cc)
    GROUP BY h.ACCOUNT_CODE, h.NAME
    ORDER BY amount DESC
  `;

  const dailyTrendSql = `
    SELECT CONVERT(date, h.DOCUMENT_DATE) AS day, 'sale' AS type, SUM(ISNULL(h.TOTAL_AMOUNT,0)) AS total
    FROM admin.SALE_INVOICE_HEADER h
    WHERE h.COMPANY_CODE=@companyCode
      AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      AND (@cc='ALL' OR h.GROUP_CODE=@cc)
    GROUP BY CONVERT(date, h.DOCUMENT_DATE)
    UNION ALL
    SELECT CONVERT(date, p.DOCUMENT_DATE) AS day, 'purchase' AS type, SUM(ISNULL(p.TOTAL_AMOUNT,0)) AS total
    FROM admin.PURCHASE_HEADER p
    WHERE p.COMPANY_CODE=@companyCode
      AND p.DOCUMENT_DATE >= @dateFrom AND p.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
      AND (@cc='ALL' OR p.GROUP_CODE=@cc)
    GROUP BY CONVERT(date, p.DOCUMENT_DATE)
    ORDER BY day, type
  `;

  const summaryRows = await runQuery(summarySql, params);
  const [trend, topItems, customerSales, dailyTrend] = await runMulti(
    [trendSql, topItemsSql, customerSql, dailyTrendSql],
    params
  );
  const r = summaryRows[0] || {};
  return {
    summary: {
      total_sales: Number(r.total_sales) || 0,
      total_purchases: Number(r.total_purchases) || 0,
      ar_balance: Number(r.ar_balance) || 0,
      ap_balance: Number(r.ap_balance) || 0,
    },
    trend,
    topItems,
    customerSales,
    dailyTrend,
  };
}