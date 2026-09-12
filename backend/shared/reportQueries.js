// Builds parameterized SQL for each report given the filter object f.
// f = { companyCode, costCenter, dateFrom, dateTo, accountId, topN }
// costCenter "ALL" means no cost-center filtering.

export function buildReport(report, f) {
  const companyCode = f.companyCode;
  const costCenter = f.costCenter || "ALL";
  const dateFrom = f.dateFrom || null;
  const dateTo = f.dateTo || null;
  const accountId = f.accountId || "";
  const topN = f.topN || 10;
  const customerId = f.customerId || "";
  const itemId = f.itemId || "";
  const customerFrom = f.customerFrom || "";
  const customerTo = f.customerTo || "";
  const itemFrom = f.itemFrom || "";
  const itemTo = f.itemTo || "";
  const vendorFrom = f.vendorFrom || "";
  const vendorTo = f.vendorTo || "";
  const accountFrom = f.accountFrom || "";
  const accountTo = f.accountTo || "";

  switch (report) {
    case "general_ledger":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, accountId },
        sql: `SELECT v.VOUCHER_DATE AS voucher_date, v.VOUCHER_TYPE AS voucher_type, v.VOUCHER_SEQ AS voucher_no,
                     va.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name, va.NARRATION AS narration,
                     ISNULL(va.DEBIT,0) AS debit, ISNULL(va.CREDIT,0) AS credit
              FROM admin.VOUCHER_ACCOUNT va
              JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
              JOIN admin.CHART c ON c.COMPANY_CODE=va.COMPANY_CODE AND c.ACCOUNT_CODE=va.ACCOUNT_CODE
              WHERE v.COMPANY_CODE=@companyCode
                AND v.VOUCHER_DATE >= @dateFrom AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                AND (@accountId='' OR va.ACCOUNT_CODE=@accountId)
              ORDER BY v.VOUCHER_DATE, v.VOUCHER_TYPE, v.VOUCHER_SEQ`,
        metaSql: `SELECT c.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name,
                     ISNULL(c.OPENING_DR,0)-ISNULL(c.OPENING_CR,0)+ISNULL(pb.dr,0)-ISNULL(pb.cr,0) AS opening_balance,
                     ISNULL(c.OPENING_DR,0)-ISNULL(c.OPENING_CR,0)+ISNULL(pb.dr,0)-ISNULL(pb.cr,0)+ISNULL(cb.dr,0)-ISNULL(cb.cr,0) AS closing_balance
                  FROM admin.CHART c
                  LEFT JOIN (
                    SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS dr, SUM(ISNULL(va.CREDIT,0)) AS cr
                    FROM admin.VOUCHER_ACCOUNT va
                    JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                    WHERE v.COMPANY_CODE=@companyCode AND v.VOUCHER_DATE < @dateFrom
                      AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                    GROUP BY va.ACCOUNT_CODE
                  ) pb ON pb.ACCOUNT_CODE=c.ACCOUNT_CODE
                  LEFT JOIN (
                    SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS dr, SUM(ISNULL(va.CREDIT,0)) AS cr
                    FROM admin.VOUCHER_ACCOUNT va
                    JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                    WHERE v.COMPANY_CODE=@companyCode AND v.VOUCHER_DATE >= @dateFrom AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                      AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                    GROUP BY va.ACCOUNT_CODE
                  ) cb ON cb.ACCOUNT_CODE=c.ACCOUNT_CODE
                  WHERE c.COMPANY_CODE=@companyCode AND @accountId<>'' AND c.ACCOUNT_CODE=@accountId`,
      };

    case "trial_balance":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, accountId },
        sql: `SELECT c.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name,
                     ISNULL(c.OPENING_DR,0) AS opening_dr, ISNULL(c.OPENING_CR,0) AS opening_cr,
                     ISNULL(p.period_dr,0) AS period_dr, ISNULL(p.period_cr,0) AS period_cr,
                     CASE WHEN (ISNULL(c.OPENING_DR,0)+ISNULL(p.period_dr,0)-ISNULL(c.OPENING_CR,0)-ISNULL(p.period_cr,0)) > 0
                          THEN (ISNULL(c.OPENING_DR,0)+ISNULL(p.period_dr,0)-ISNULL(c.OPENING_CR,0)-ISNULL(p.period_cr,0)) ELSE 0 END AS closing_dr,
                     CASE WHEN (ISNULL(c.OPENING_CR,0)+ISNULL(p.period_cr,0)-ISNULL(c.OPENING_DR,0)-ISNULL(p.period_dr,0)) > 0
                          THEN (ISNULL(c.OPENING_CR,0)+ISNULL(p.period_cr,0)-ISNULL(c.OPENING_DR,0)-ISNULL(p.period_dr,0)) ELSE 0 END AS closing_cr
              FROM admin.CHART c
              LEFT JOIN (
                SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS period_dr, SUM(ISNULL(va.CREDIT,0)) AS period_cr
                FROM admin.VOUCHER_ACCOUNT va
                JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                WHERE v.COMPANY_CODE=@companyCode
                  AND v.VOUCHER_DATE >= @dateFrom AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                  AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                GROUP BY va.ACCOUNT_CODE
              ) p ON p.ACCOUNT_CODE=c.ACCOUNT_CODE
              WHERE c.COMPANY_CODE=@companyCode
                AND (@accountId='' OR c.ACCOUNT_CODE=@accountId)
                AND (ISNULL(c.OPENING_DR,0)<>0 OR ISNULL(c.OPENING_CR,0)<>0 OR ISNULL(p.period_dr,0)<>0 OR ISNULL(p.period_cr,0)<>0)
              ORDER BY c.ACCOUNT_CODE`,
      };

    case "accounts_receivable":
      return {
        params: { companyCode, costCenter, dateTo, accountId },
        sql: `SELECT c.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name,
                     ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0) AS debit,
                     ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0) AS credit,
                     (ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0))-(ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0)) AS balance
              FROM admin.CHART c
              LEFT JOIN (
                SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS dr, SUM(ISNULL(va.CREDIT,0)) AS cr
                FROM admin.VOUCHER_ACCOUNT va
                JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                WHERE v.COMPANY_CODE=@companyCode
                  AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                  AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                GROUP BY va.ACCOUNT_CODE
              ) m ON m.ACCOUNT_CODE=c.ACCOUNT_CODE
              WHERE c.COMPANY_CODE=@companyCode
                AND c.ACCOUNT_CATEGORY='S' AND c.LEVEL_NO=5
                AND (@accountId='' OR c.ACCOUNT_CODE=@accountId)
                AND (ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0))-(ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0)) > 0
              ORDER BY c.ACCOUNT_CODE`,
      };

    case "accounts_payable":
      return {
        params: { companyCode, costCenter, dateTo, accountId },
        sql: `SELECT c.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name,
                     ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0) AS debit,
                     ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0) AS credit,
                     (ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0))-(ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0)) AS balance
              FROM admin.CHART c
              LEFT JOIN (
                SELECT va.ACCOUNT_CODE, SUM(ISNULL(va.DEBIT,0)) AS dr, SUM(ISNULL(va.CREDIT,0)) AS cr
                FROM admin.VOUCHER_ACCOUNT va
                JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                WHERE v.COMPANY_CODE=@companyCode
                  AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                  AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                GROUP BY va.ACCOUNT_CODE
              ) m ON m.ACCOUNT_CODE=c.ACCOUNT_CODE
              WHERE c.COMPANY_CODE=@companyCode
                AND c.ACCOUNT_CATEGORY='V' AND c.LEVEL_NO=5
                AND (@accountId='' OR c.ACCOUNT_CODE=@accountId)
                AND (ISNULL(c.OPENING_CR,0)+ISNULL(m.cr,0))-(ISNULL(c.OPENING_DR,0)+ISNULL(m.dr,0)) > 0
              ORDER BY c.ACCOUNT_CODE`,
      };

    case "item_wise_sale":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, itemFrom, itemTo },
        sql: `SELECT d.ITEM_ID AS item_id, d.ITEM_NAME AS item_name,
                     SUM(ISNULL(d.QUANTITY,0)) AS qty, SUM(ISNULL(d.AMOUNT,0)) AS amount
              FROM admin.SALE_INVOICE_DETAIL d
              JOIN admin.SALE_INVOICE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO
              WHERE h.COMPANY_CODE=@companyCode
                AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR h.GROUP_CODE=@costCenter)
                AND (@itemFrom='' OR d.ITEM_ID>=@itemFrom)
                AND (@itemTo='' OR d.ITEM_ID<=@itemTo)
              GROUP BY d.ITEM_ID, d.ITEM_NAME
              ORDER BY amount DESC`,
      };

    case "item_wise_purchase":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, itemFrom, itemTo },
        sql: `SELECT d.ITEM_ID AS item_id, d.ITEM_NAME AS item_name,
                     SUM(ISNULL(d.QUANTITY,0)) AS qty, SUM(ISNULL(d.AMOUNT,0)) AS amount
              FROM admin.PURCHASE_DETAIL d
              JOIN admin.PURCHASE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO
              WHERE d.COMPANY_CODE=@companyCode
                AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR h.GROUP_CODE=@costCenter)
                AND (@itemFrom='' OR d.ITEM_ID>=@itemFrom)
                AND (@itemTo='' OR d.ITEM_ID<=@itemTo)
              GROUP BY d.ITEM_ID, d.ITEM_NAME
              ORDER BY amount DESC`,
      };

    case "customer_wise_sale":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, customerFrom, customerTo },
        sql: `SELECT h.ACCOUNT_CODE AS account_code, h.NAME AS name,
                     COUNT(*) AS invoices, SUM(ISNULL(h.TOTAL_AMOUNT,0)) AS amount
              FROM admin.SALE_INVOICE_HEADER h
              WHERE h.COMPANY_CODE=@companyCode
                AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR h.GROUP_CODE=@costCenter)
                AND (@customerFrom='' OR h.ACCOUNT_CODE>=@customerFrom)
                AND (@customerTo='' OR h.ACCOUNT_CODE<=@customerTo)
              GROUP BY h.ACCOUNT_CODE, h.NAME
              ORDER BY amount DESC`,
      };

    case "vendor_wise_purchase":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, vendorFrom, vendorTo },
        sql: `SELECT h.ACCOUNT_CODE AS vendor_code, h.ACCOUNT_NAME AS name,
                     COUNT(*) AS invoices, SUM(ISNULL(h.TOTAL_AMOUNT,0)) AS amount
              FROM admin.PURCHASE_HEADER h
              WHERE h.COMPANY_CODE=@companyCode
                AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR h.GROUP_CODE=@costCenter)
                AND (@vendorFrom='' OR h.ACCOUNT_CODE>=@vendorFrom)
                AND (@vendorTo='' OR h.ACCOUNT_CODE<=@vendorTo)
              GROUP BY h.ACCOUNT_CODE, h.ACCOUNT_NAME
              ORDER BY amount DESC`,
      };

    case "top_items_sales":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, topN },
        sql: `SELECT TOP (@topN) d.ITEM_ID AS item_id, d.ITEM_NAME AS item_name,
                     SUM(ISNULL(d.QUANTITY,0)) AS qty, SUM(ISNULL(d.AMOUNT,0)) AS amount
              FROM admin.SALE_INVOICE_DETAIL d
              JOIN admin.SALE_INVOICE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO
              WHERE h.COMPANY_CODE=@companyCode
                AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR h.GROUP_CODE=@costCenter)
              GROUP BY d.ITEM_ID, d.ITEM_NAME
              ORDER BY amount DESC`,
      };

    case "customer_item_wise_sale":
      return {
        params: { companyCode, costCenter, dateFrom, dateTo, customerId, itemId },
        sql: `SELECT h.ACCOUNT_CODE AS account_code, h.NAME AS customer_name,
                     d.ITEM_ID AS item_id, d.ITEM_NAME AS item_name,
                     SUM(ISNULL(d.QUANTITY,0)) AS qty, SUM(ISNULL(d.AMOUNT,0)) AS amount
              FROM admin.SALE_INVOICE_DETAIL d
              JOIN admin.SALE_INVOICE_HEADER h ON h.COMPANY_CODE=d.COMPANY_CODE AND h.DOCUMENT_NO=d.DOCUMENT_NO
              WHERE h.COMPANY_CODE=@companyCode
                AND h.DOCUMENT_DATE >= @dateFrom AND h.DOCUMENT_DATE < DATEADD(day,1,@dateTo)
                AND (@costCenter='ALL' OR h.GROUP_CODE=@costCenter)
                AND (@customerId='' OR h.ACCOUNT_CODE=@customerId)
                AND (@itemId='' OR d.ITEM_ID=@itemId)
              GROUP BY h.ACCOUNT_CODE, h.NAME, d.ITEM_ID, d.ITEM_NAME
              ORDER BY h.NAME, d.ITEM_NAME`,
      };

    case "customer_aging":
      return {
        params: { companyCode, costCenter, dateTo, accountFrom, accountTo },
        sql: `;WITH v AS (
                SELECT va.ACCOUNT_CODE,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 0 AND 30 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b0_30,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 31 AND 60 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b31_60,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 61 AND 90 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b61_90,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 91 AND 120 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b91_120,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 121 AND 150 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b121_150,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 151 AND 180 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b151_180,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) >= 181 THEN ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0) ELSE 0 END) AS b180_plus,
                  SUM(ISNULL(va.DEBIT,0)-ISNULL(va.CREDIT,0)) AS total_movement
                FROM admin.VOUCHER_ACCOUNT va
                JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                WHERE v.COMPANY_CODE=@companyCode
                  AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                  AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                GROUP BY va.ACCOUNT_CODE
              )
              SELECT c.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name,
                ISNULL(v.b0_30,0) AS [0_30],
                ISNULL(v.b31_60,0) AS [31_60],
                ISNULL(v.b61_90,0) AS [61_90],
                ISNULL(v.b91_120,0) AS [91_120],
                ISNULL(v.b121_150,0) AS [121_150],
                ISNULL(v.b151_180,0) AS [151_180],
                ISNULL(v.b180_plus,0) + (ISNULL(c.OPENING_DR,0)-ISNULL(c.OPENING_CR,0)) AS [180_plus],
                (ISNULL(c.OPENING_DR,0)-ISNULL(c.OPENING_CR,0)) + ISNULL(v.total_movement,0) AS closing_balance
              FROM admin.CHART c
              LEFT JOIN v ON v.ACCOUNT_CODE=c.ACCOUNT_CODE
              WHERE c.COMPANY_CODE=@companyCode
                AND c.ACCOUNT_CATEGORY='S' AND c.LEVEL_NO=5
                AND (@accountFrom='' OR c.ACCOUNT_CODE >= @accountFrom)
                AND (@accountTo='' OR c.ACCOUNT_CODE <= @accountTo)
                AND (ISNULL(c.OPENING_DR,0)-ISNULL(c.OPENING_CR,0)+ISNULL(v.total_movement,0)) > 0
              ORDER BY c.ACCOUNT_CODE`,
      };

    case "vendor_aging":
      return {
        params: { companyCode, costCenter, dateTo, accountFrom, accountTo },
        sql: `;WITH v AS (
                SELECT va.ACCOUNT_CODE,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 0 AND 30 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b0_30,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 31 AND 60 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b31_60,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 61 AND 90 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b61_90,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 91 AND 120 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b91_120,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 121 AND 150 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b121_150,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) BETWEEN 151 AND 180 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b151_180,
                  SUM(CASE WHEN DATEDIFF(day, v.VOUCHER_DATE, @dateTo) >= 181 THEN ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0) ELSE 0 END) AS b180_plus,
                  SUM(ISNULL(va.CREDIT,0)-ISNULL(va.DEBIT,0)) AS total_movement
                FROM admin.VOUCHER_ACCOUNT va
                JOIN admin.VOUCHER v ON v.COMPANY_CODE=va.COMPANY_CODE AND v.VOUCHER_TYPE=va.VOUCHER_TYPE AND v.VOUCHER_SEQ=va.VOUCHER_SEQ
                WHERE v.COMPANY_CODE=@companyCode
                  AND v.VOUCHER_DATE < DATEADD(day,1,@dateTo)
                  AND (@costCenter='ALL' OR va.GROUP_CODE=@costCenter)
                GROUP BY va.ACCOUNT_CODE
              )
              SELECT c.ACCOUNT_CODE AS account_code, c.ACCOUNT_NAME AS account_name,
                ISNULL(v.b0_30,0) AS [0_30],
                ISNULL(v.b31_60,0) AS [31_60],
                ISNULL(v.b61_90,0) AS [61_90],
                ISNULL(v.b91_120,0) AS [91_120],
                ISNULL(v.b121_150,0) AS [121_150],
                ISNULL(v.b151_180,0) AS [151_180],
                ISNULL(v.b180_plus,0) + (ISNULL(c.OPENING_CR,0)-ISNULL(c.OPENING_DR,0)) AS [180_plus],
                (ISNULL(c.OPENING_CR,0)-ISNULL(c.OPENING_DR,0)) + ISNULL(v.total_movement,0) AS closing_balance
              FROM admin.CHART c
              LEFT JOIN v ON v.ACCOUNT_CODE=c.ACCOUNT_CODE
              WHERE c.COMPANY_CODE=@companyCode
                AND c.ACCOUNT_CATEGORY='V' AND c.LEVEL_NO=5
                AND (@accountFrom='' OR c.ACCOUNT_CODE >= @accountFrom)
                AND (@accountTo='' OR c.ACCOUNT_CODE <= @accountTo)
                AND (ISNULL(c.OPENING_CR,0)-ISNULL(c.OPENING_DR,0)+ISNULL(v.total_movement,0)) > 0
              ORDER BY c.ACCOUNT_CODE`,
      };

    default:
      throw new Error("Unknown report: " + report);
  }
}