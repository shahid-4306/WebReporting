
import React from "react";
import { useParams, Link } from "react-router-dom";
import { REPORT_MAP } from "@/lib/reports";
import { useReportAccess } from "@/hooks/useReportAccess";
import ReportViewer from "@/components/reports/ReportViewer";
import { ArrowLeft } from "lucide-react";

// Key mapping - URL/database format se frontend format mein convert karein
const KEY_MAPPING = {
  "items_wise_sale": "item_wise_sale",
  "items-wise-sale": "item_wise_sale",
  "customer_items_wise_sale": "customer_item_wise_sale",
  "customer-items-wise-sale": "customer_item_wise_sale",
  "items_wise_purchase": "item_wise_purchase",
  "items-wise-purchase": "item_wise_purchase",
  "general-ledger": "general_ledger",
  "trial-balance": "trial_balance",
  "accounts-receivable": "accounts_receivable",
  "accounts-payable": "accounts_payable",
  "customer-aging": "customer_aging",
  "vendor-aging": "vendor_aging",
  "customer-wise-sale": "customer_wise_sale",
  "top-items-sales": "top_items_sales",
  "vendor-wise-purchase": "vendor_wise_purchase",
};

export default function ReportPage() {
  const { reportKey } = useParams();
  const { hasReport, loading } = useReportAccess();
  
  // Pehle mapping check karein, phir dash ko underscore mein convert
  const mappedKey = KEY_MAPPING[reportKey] || reportKey;
  const normalizedKey = mappedKey.replace(/-/g, "_");
  const report = REPORT_MAP[normalizedKey];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">
          Report not found for key: <strong>{reportKey}</strong>
        </p>
        <Link to="/" className="text-primary hover:underline inline-block">Back to dashboard</Link>
      </div>
    );
  }

  if (!hasReport(report.key)) {
    return (
      <div className="text-center py-20 space-y-2">
        <p className="text-muted-foreground">You do not have access to this report.</p>
        <Link to="/" className="text-primary hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="no-print inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>
      <div>
        <h1 className="text-2xl font-heading font-semibold">{report.title}</h1>
        <p className="text-muted-foreground mt-1">{report.description}</p>
      </div>
      <ReportViewer report={report} />
    </div>
  );
}