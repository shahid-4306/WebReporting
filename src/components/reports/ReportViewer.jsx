import { db } from "@/api/base44Client";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Loader2, Printer, Search, Download, RefreshCw, FileDown } from "lucide-react";
import FilterBar from "./FilterBar";
import ReportTable from "./ReportTable";
import { exportReportToExcel } from "./exportExcel";
import { exportReportToPdf } from "./exportPdf";
import { useLookups } from "@/hooks/useLookups";

function defaultDates() {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { from, to };
}

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportViewer({ report }) {
  const [filters, setFilters] = useState({
    companyCode: "",
    costCenter: "ALL",
    dateFrom: defaultDates().from,
    dateTo: defaultDates().to,
    accountId: "",
    topN: 10,
    customerId: "",
    itemId: "",
    customerFrom: "",
    customerTo: "",
    itemFrom: "",
    itemTo: "",
    vendorFrom: "",
    vendorTo: "",
    accountFrom: "",
    accountTo: "",
  });
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const printRef = useRef(null);

  // Setup/lookup tables are cached locally; useLookups reads from the cache
  // and exposes refresh() to re-fetch from the database.
  const { companies, costCenters, accounts, customers, vendors, items, loading: loadingLookups, refreshing, refresh } = useLookups(filters.companyCode);
  const lookups = { companies, costCenters, accounts, customers, vendors, items };

  // Pick the first company once the (cached) company list is available.
  useEffect(() => {
    if (!filters.companyCode && companies[0]) {
      setFilters((prev) => ({ ...prev, companyCode: companies[0].code }));
    }
  }, [companies, filters.companyCode]);

  const canRun = filters.companyCode &&
    (report.filters.includes("asOfDate") ? filters.dateTo : filters.dateFrom && filters.dateTo) &&
    (report.key !== "general_ledger" || !!filters.accountId);

  const handleRun = async () => {
    setError("");
    setLoadingReport(true);
    setRows(null);
    setMeta(null);
    try {
      const res = await db.functions.invoke("runReport", {
        report: report.key,
        companyCode: filters.companyCode,
        costCenter: filters.costCenter,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        accountId: filters.accountId,
        topN: filters.topN,
        customerId: filters.customerId,
        itemId: filters.itemId,
        customerFrom: filters.customerFrom,
        customerTo: filters.customerTo,
        itemFrom: filters.itemFrom,
        itemTo: filters.itemTo,
        vendorFrom: filters.vendorFrom,
        vendorTo: filters.vendorTo,
        accountFrom: filters.accountFrom,
        accountTo: filters.accountTo,
      });
      setRows(res.data.rows || []);
      setMeta(res.data.meta || null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const companyName = (lookups.companies.find((c) => c.code === filters.companyCode) || {}).name || filters.companyCode;

  return (
    <div className="space-y-5">
      <div className="no-print space-y-4">
        <FilterBar filters={report.filters} value={filters} lookups={lookups} onChange={setFilters} />
        <div className="flex items-center gap-3">
          <Button onClick={handleRun} disabled={!canRun || loadingReport || loadingLookups}>
            {loadingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Run Report
          </Button>
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={() => refresh()}
            title="Re-fetch setup tables (Company, Cost Center, Chart, Items) from the database"
          >
            <RefreshCw className={"w-4 h-4 mr-2 " + (refreshing ? "animate-spin" : "")} />
            Refresh Setup
          </Button>
          {rows && rows.length > 0 && (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const period = report.filters.includes("asOfDate")
                    ? `As of ${filters.dateTo}`
                    : `${filters.dateFrom} to ${filters.dateTo}`;
                  const accountLine = report.key === "general_ledger" && meta
                    ? `Account: ${meta.account_code} - ${meta.account_name}`
                    : "";
                  exportReportToExcel(report, rows, meta, { title: report.title, companyName, period, accountLine });
                }}
              >
                <Download className="w-4 h-4 mr-2" /> Export to Excel
              </Button>
              <Button
                variant="outline"
                disabled={exportingPdf}
                onClick={async () => {
                  setExportingPdf(true);
                  try {
                    const stamp = new Date().toISOString().slice(0, 10);
                    await exportReportToPdf(printRef.current, `${report.key}_${stamp}.pdf`);
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setExportingPdf(false);
                  }
                }}
              >
                {exportingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                Export to PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="no-print p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {loadingReport && (
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading report…
        </div>
      )}

      {rows && !loadingReport && (
        <div ref={printRef} className="print-area space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h2 className="text-lg font-semibold">{report.title}</h2>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{companyName}</span>
                {filters.costCenter !== "ALL" ? ` · Cost Center: ${filters.costCenter}` : " · Cost Center: ALL"}
                {report.filters.includes("asOfDate")
                  ? ` · As of ${filters.dateTo}`
                  : ` · ${filters.dateFrom} to ${filters.dateTo}`}
              </p>
              {report.key === "general_ledger" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {meta ? (
                    <>
                      <span className="font-medium text-foreground">Account: {meta.account_code} - {meta.account_name}</span>
                      <span className="ml-3">Opening Balance: {formatMoney(meta.opening_balance)}</span>
                      <span className="ml-3">Closing Balance: {formatMoney(meta.closing_balance)}</span>
                    </>
                  ) : (
                    <span>Account: All Accounts</span>
                  )}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{rows.length} rows</span>
          </div>
          <ReportTable
            columns={report.columns}
            rows={meta ? [{ voucher_date: "", voucher_no: "", narration: "Opening Balance", debit: 0, credit: 0, _opening: true }, ...rows] : rows}
            initialBalance={meta ? meta.opening_balance : 0}
          />
        </div>
      )}
    </div>
  );
}