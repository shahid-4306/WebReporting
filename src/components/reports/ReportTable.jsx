import React, { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

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

function compareValues(a, b, col) {
  let va = a, vb = b;
  if (col.type === "date") {
    va = a ? new Date(a).getTime() : 0;
    vb = b ? new Date(b).getTime() : 0;
    if (isNaN(va)) va = 0;
    if (isNaN(vb)) vb = 0;
  } else if (col.type === "money" || col.type === "number" || col.type === "running") {
    va = Number(a) || 0;
    vb = Number(b) || 0;
  } else {
    va = String(a ?? "").toLowerCase();
    vb = String(b ?? "").toLowerCase();
    return va.localeCompare(vb);
  }
  return va < vb ? -1 : va > vb ? 1 : 0;
}

export default function ReportTable({ columns, rows, initialBalance = 0 }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const sortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const opening = rows.filter((r) => r._opening);
    const body = rows.filter((r) => !r._opening);
    const sorted = [...body].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], col);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return [...opening, ...sorted];
  }, [rows, sortKey, sortDir, columns]);

  if (!rows || rows.length === 0) {
    return <div className="py-16 text-center text-muted-foreground">No data for the selected filters.</div>;
  }

  // Running balance (debit - credit cumulative) for columns of type "running".
  let running = Number(initialBalance) || 0;
  const hasRunning = columns.some((c) => c.type === "running");
  const totalDebit = sortedRows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = sortedRows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const closingBalance = (Number(initialBalance) || 0) + totalDebit - totalCredit;

  // Column totals for money/number columns (used in the footer for every report).
  const numericKeys = columns.filter((c) => c.type === "money" || c.type === "number").map((c) => c.key);
  const columnTotals = {};
  numericKeys.forEach((k) => { columnTotals[k] = sortedRows.reduce((s, r) => s + (Number(r[k]) || 0), 0); });
  const showFooter = hasRunning || numericKeys.length > 0;

  const handleSort = (col) => {
    if (col.type === "running") return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }) => {
    if (col.type === "running") return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3 h-3 ml-1 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary" />;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            {columns.map((col) => {
              const isSortable = col.type !== "running";
              return (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  className={"px-3 py-2.5 font-medium whitespace-nowrap select-none " +
                    (col.type === "money" || col.type === "number" || col.type === "running" ? "text-right" : "text-left") +
                    (isSortable ? " cursor-pointer hover:bg-muted transition-colors" : "")}
                >
                  <span className={"inline-flex items-center " +
                    (col.type === "money" || col.type === "number" || col.type === "running" ? "flex-row-reverse" : "flex-row")}>
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={i} className={"border-t border-border hover:bg-muted/30 " + (row._opening ? "font-semibold bg-muted/40" : "")}>
              {columns.map((col) => {
                let cell;
                if (col.type === "running") {
                  running += (Number(row.debit) || 0) - (Number(row.credit) || 0);
                  cell = formatMoney(running);
                } else if (col.type === "money") {
                  cell = formatMoney(row[col.key]);
                } else if (col.type === "number") {
                  cell = formatNumber(row[col.key]);
                } else if (col.type === "date") {
                  cell = formatDate(row[col.key]);
                } else {
                  cell = row[col.key] ?? "";
                }
                const align = col.type === "money" || col.type === "number" || col.type === "running" ? "text-right" : "text-left";
                return (
                  <td key={col.key} className={"px-3 py-2 whitespace-nowrap " + align}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {showFooter && (
          <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
            <tr>
              {columns.map((col, idx) => {
                let cell = "";
                if (col.type === "running") cell = formatMoney(closingBalance);
                else if (col.type === "money") cell = formatMoney(columnTotals[col.key] || 0);
                else if (col.type === "number") cell = formatNumber(columnTotals[col.key] || 0);
                else if (idx === 0) cell = "Total";
                const align = col.type === "money" || col.type === "number" || col.type === "running" ? "text-right" : "text-left";
                return (
                  <td key={col.key} className={"px-3 py-2.5 whitespace-nowrap " + align}>{cell}</td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}