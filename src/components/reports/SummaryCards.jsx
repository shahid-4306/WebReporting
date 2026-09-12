import React from "react";
import { Loader2, TrendingUp, ShoppingCart, ArrowDownLeft, ArrowUpRight } from "lucide-react";

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Card({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={"w-9 h-9 rounded-md flex items-center justify-center " + accent}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-semibold mt-2 tabular-nums">{formatMoney(value)}</p>
    </div>
  );
}

export default function SummaryCards({ summary, loading, error }) {
  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading summary…
      </div>
    );
  }
  if (error && !loading) {
    return <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>;
  }
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card label="Total Sales" value={summary.total_sales} icon={TrendingUp} accent="bg-chart-1/15 text-chart-1" />
      <Card label="Total Purchases" value={summary.total_purchases} icon={ShoppingCart} accent="bg-chart-2/15 text-chart-2" />
      <Card label="Accounts Receivable" value={summary.ar_balance} icon={ArrowDownLeft} accent="bg-chart-4/15 text-chart-4" />
      <Card label="Accounts Payable" value={summary.ap_balance} icon={ArrowUpRight} accent="bg-chart-5/15 text-chart-5" />
    </div>
  );
}