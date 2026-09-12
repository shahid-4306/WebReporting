// Builds an Excel-compatible (.xls) file from a report's columns + rows and
// triggers a browser download. Mirrors the formatting logic in ReportTable
// (running balance, totals row) so the exported file matches the on-screen view.

function escapeCell(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatNumber(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

function cellValue(col, row, runningRef) {
  if (col.type === "running") {
    runningRef.value += (Number(row.debit) || 0) - (Number(row.credit) || 0);
    return formatMoney(runningRef.value);
  }
  if (col.type === "money") return formatMoney(row[col.key]);
  if (col.type === "number") return formatNumber(row[col.key]);
  if (col.type === "date") return formatDate(row[col.key]);
  return row[col.key] ?? "";
}

export function exportReportToExcel(report, rows, meta, context) {
  const columns = report.columns;
  const hasRunning = columns.some((c) => c.type === "running");
  const initialBalance = meta ? Number(meta.opening_balance) || 0 : 0;

  // Build the body rows (include the opening-balance row for the General Ledger).
  const bodyRows = meta ? [{ voucher_date: "", voucher_no: "", narration: "Opening Balance", debit: 0, credit: 0, _opening: true }, ...rows] : rows;

  const running = { value: initialBalance };
  const totalDebit = bodyRows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = bodyRows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const closingBalance = initialBalance + totalDebit - totalCredit;

  const numericKeys = columns.filter((c) => c.type === "money" || c.type === "number").map((c) => c.key);
  const columnTotals = {};
  numericKeys.forEach((k) => { columnTotals[k] = bodyRows.reduce((s, r) => s + (Number(r[k]) || 0), 0); });
  const showFooter = hasRunning || numericKeys.length > 0;

  const headerCells = columns.map((c) => `<th style="background:#f1f5f9;font-weight:bold;text-align:${c.type === "money" || c.type === "number" || c.type === "running" ? "right" : "left"}">${escapeCell(c.label)}</th>`).join("");

  const bodyHtml = bodyRows.map((row) => {
    const runningRef = { value: running.value };
    const cells = columns.map((col) => {
      const val = cellValue(col, row, col.type === "running" ? running : runningRef);
      const align = col.type === "money" || col.type === "number" || col.type === "running" ? "right" : "left";
      return `<td style="text-align:${align};mso-number-format:'\\@'">${escapeCell(val)}</td>`;
    }).join("");
    if (hasRunning) running.value = runningRef.value;
    const style = row._opening ? "font-weight:bold;background:#f1f5f9;" : "";
    return `<tr style="${style}">${cells}</tr>`;
  }).join("");

  let footerHtml = "";
  if (showFooter) {
    footerHtml = `<tr style="font-weight:bold;background:#f1f5f9;border-top:2px solid #000">` +
      columns.map((col, idx) => {
        let val = "";
        if (col.type === "running") val = formatMoney(closingBalance);
        else if (col.type === "money") val = formatMoney(columnTotals[col.key] || 0);
        else if (col.type === "number") val = formatNumber(columnTotals[col.key] || 0);
        else if (idx === 0) val = "Total";
        const align = col.type === "money" || col.type === "number" || col.type === "running" ? "right" : "left";
        return `<td style="text-align:${align};mso-number-format:'\\@'">${escapeCell(val)}</td>`;
      }).join("") +
      `</tr>`;
  }

  const titleLine = context.title || report.title;
  const metaLine = [context.companyName, context.period, context.accountLine].filter(Boolean).join(" · ");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>
<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial;font-size:11px">
  <tr><td colspan="${columns.length}" style="font-size:14px;font-weight:bold">${escapeCell(titleLine)}</td></tr>
  ${metaLine ? `<tr><td colspan="${columns.length}" style="font-size:11px">${escapeCell(metaLine)}</td></tr>` : ""}
  <tr></tr>
  <tr>${headerCells}</tr>
  ${bodyHtml}
  ${footerHtml}
</table>
</body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${report.key}_${stamp}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}