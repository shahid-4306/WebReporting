import React from "react";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

function compactMoney(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(0);
}
function truncate(s, n = 18) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>}
      <div className="h-64 mt-3">{children}</div>
    </div>
  );
}

export default function DashboardCharts({ trend, topItems, customerSales, dailyTrend, loading, error }) {
  if (loading && !trend) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading charts…
      </div>
    );
  }
  if (error && !trend) {
    return <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>;
  }
  if (!trend) return null;

  const map = {};
  trend.forEach((r) => {
    if (!map[r.month]) map[r.month] = { month: r.month, sales: 0, purchases: 0 };
    if (r.type === "sale") map[r.month].sales = Number(r.total) || 0;
    else map[r.month].purchases = Number(r.total) || 0;
  });
  const trendData = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));

  // Build daily sales vs purchases comparative series
  const dailyMap = {};
  (dailyTrend || []).forEach((r) => {
    const day = r.day ? String(r.day).slice(0, 10) : "";
    if (!day) return;
    if (!dailyMap[day]) dailyMap[day] = { day, sales: 0, purchases: 0 };
    if (r.type === "sale") dailyMap[day].sales = Number(r.total) || 0;
    else dailyMap[day].purchases = Number(r.total) || 0;
  });
  const dailyData = Object.values(dailyMap).sort((a, b) => a.day.localeCompare(b.day));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-heading font-medium">Sales & Performance Charts</h2>

      {dailyData.length > 0 && (
        <ChartCard title="Daily Sales vs Purchases" subtitle="Comparative daily trend — spot performance spikes at a glance">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
              <Tooltip formatter={(v) => Number(v).toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Sales" />
              <Line type="monotone" dataKey="purchases" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Purchases" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title="Sales Trend" subtitle="Monthly sales vs purchases">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gPurch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Legend />
            <Area type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" fill="url(#gSales)" strokeWidth={2} />
            <Area type="monotone" dataKey="purchases" stroke="hsl(var(--chart-2))" fill="url(#gPurch)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top Selling Items" subtitle="By sales amount (top 10)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={topItems} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tickFormatter={compactMoney} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="item_name" width={130} tick={{ fontSize: 11 }} tickFormatter={(v) => truncate(v, 16)} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => Number(v).toLocaleString()} />
              <Bar dataKey="amount" fill="hsl(var(--chart-4))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer-wise Sales" subtitle="By sales amount (top 10)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={customerSales} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tickFormatter={compactMoney} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickFormatter={(v) => truncate(v, 16)} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => Number(v).toLocaleString()} />
              <Bar dataKey="amount" fill="hsl(var(--chart-5))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}