
import { db } from "@/api/base44Client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { REPORTS, REPORT_GROUPS } from "@/lib/reports";
import { useReportAccess } from "@/hooks/useReportAccess";
import { FileText, ArrowRight, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SummaryCards from "@/components/reports/SummaryCards";
import DashboardCharts from "@/components/reports/DashboardCharts";
import { useLookups } from "@/hooks/useLookups";

const PERIODS = [
  { value: "this_month", label: "This Month" },
  { value: "yesterday", label: "Yesterday" },
  { value: "today", label: "Today" },
  { value: "previous_month", label: "Previous Month" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

function iso(d) { return d.toISOString().slice(0, 10); }

function computePeriod(period, customFrom, customTo) {
  const now = new Date();
  const today = iso(now);
  switch (period) {
    case "today": return { from: today, to: today };
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); const ys = iso(y); return { from: ys, to: ys }; }
    case "this_month": return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "previous_month": { const first = new Date(now.getFullYear(), now.getMonth() - 1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); return { from: iso(first), to: iso(last) }; }
    case "this_year": return { from: iso(new Date(now.getFullYear(), 0, 1)), to: today };
    case "custom": return { from: customFrom, to: customTo };
    default: return { from: today, to: today };
  }
}

export default function Dashboard() {
  const { user, isAdmin, hasReport } = useReportAccess();
  const visible = REPORTS.filter((r) => hasReport(r.key));

  const [companyCode, setCompanyCode] = useState("");
  const [costCenter, setCostCenter] = useState("ALL");
  const [period, setPeriod] = useState("this_month");
  const initCustom = computePeriod("this_month");
  const [customFrom, setCustomFrom] = useState(initCustom.from);
  const [customTo, setCustomTo] = useState(initCustom.to);
  const [applied, setApplied] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup/lookup tables (Company, Cost Center, Chart, Items) are cached
  // locally; useLookups reads from the cache and exposes refresh() to
  // re-fetch from the database.
  const { companies, costCenters, refreshing, refresh } = useLookups(companyCode);

  // Keep the latest period selection accessible to the company-change effect
  // without making that effect re-run on period changes.
  const periodRef = useRef({ period, customFrom, customTo });
  periodRef.current = { period, customFrom, customTo };

  // Pick the first allowed company, and reset to it whenever the current
  // selection is no longer in the list (e.g. after a fresh fetch for a
  // different user on a shared browser).
  useEffect(() => {
    if (companies.length === 0) return;
    if (!companyCode || !companies.some((c) => c.code === companyCode)) {
      setCompanyCode(companies[0].code);
    }
  }, [companies]);

  // On company change, reset the cost center and auto-apply the dashboard.
  useEffect(() => {
    if (!companyCode) return;
    setCostCenter("ALL");
    const { period: p, customFrom: cf, customTo: ct } = periodRef.current;
    const pr = computePeriod(p, cf, ct);
    if (pr.from && pr.to) {
      setApplied({ companyCode, dateFrom: pr.from, dateTo: pr.to, costCenter: "ALL", refresh: false });
    }
  }, [companyCode]);

  const { dateFrom, dateTo } = useMemo(() => computePeriod(period, customFrom, customTo), [period, customFrom, customTo]);

  useEffect(() => {
    if (!applied || !applied.companyCode || !applied.dateFrom || !applied.dateTo) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await db.functions.invoke("getDashboardData", { ...applied, refresh: applied.refresh || false });
        if (!alive) return;
        
        // Safe data extraction with fallbacks
        const responseData = res?.data || res || {};
        setData({
          summary: responseData.summary || null,
          trend: responseData.trend || [],
          topItems: responseData.topItems || [],
          customerSales: responseData.customerSales || [],
          dailyTrend: responseData.dailyTrend || [],
        });
      } catch (e) {
        if (alive) setError(e.response?.data?.error || e.message || "Failed to load dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [applied]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Welcome, {user?.full_name || user?.username || 'User'}</h1>
        <p className="text-muted-foreground mt-1">
          You have access to {visible.length} report{visible.length !== 1 ? "s" : ""}. Select a report to view and print.
        </p>
      </div>

      <div className="flex items-end gap-4 flex-wrap no-print">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Company</Label>
          <Select value={companyCode} onValueChange={setCompanyCode}>
            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cost Center</Label>
          <Select value={costCenter} onValueChange={setCostCenter}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL</SelectItem>
              {costCenters.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {period === "custom" && (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="h-9 w-40" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" className="h-9 w-40" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}

        <Button
          className="h-9"
          onClick={() => {
            if (!companyCode) {
              setError("Please select a company.");
              return;
            }
            if (period === "custom" && (!customFrom || !customTo)) {
              setError("Please select a custom date range.");
              return;
            }
            setError("");
            setApplied({ companyCode, dateFrom, dateTo, costCenter, refresh: true });
          }}
        >
          Filter
        </Button>

        <Button
          variant="outline"
          className="h-9"
          disabled={refreshing}
          onClick={() => refresh()}
          title="Re-fetch setup tables (Company, Cost Center, Chart, Items) from the database"
        >
          <RefreshCw className={"w-4 h-4 mr-2 " + (refreshing ? "animate-spin" : "")} />
          Refresh Setup
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {applied && (
        <>
          <SummaryCards summary={data?.summary} loading={loading} error={error} />
          <DashboardCharts
            trend={data?.trend || []}
            topItems={data?.topItems || []}
            customerSales={data?.customerSales || []}
            dailyTrend={data?.dailyTrend || []}
            loading={loading}
            error={error}
          />
        </>
      )}

      {!applied && !loading && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          Select filters and click Filter to load dashboard data.
        </div>
      )}

      {REPORT_GROUPS.map((group) => {
        const items = visible.filter((r) => r.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <h2 className="text-lg font-heading font-medium mb-3">{group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((r) => (
                <Link
                  key={r.key}
                  to={`/reports/${r.key}`}
                  className="group rounded-lg border border-border p-5 bg-card hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-medium mt-3">{r.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {isAdmin && (
        <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          As an admin you can manage who sees which reports from the{" "}
          <Link to="/users" className="text-primary hover:underline">User Access</Link> page.
        </div>
      )}
    </div>
  );
}