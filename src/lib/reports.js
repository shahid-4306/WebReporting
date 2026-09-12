
export const REPORT_GROUPS = ["Accounting", "Sales", "Purchases"];

export const REPORTS = [
  {
    key: "general_ledger",
    title: "General Ledger",
    group: "Accounting",
    description: "All voucher transactions by account and period.",
    filters: ["company", "costCenter", "dateRange", "account"],
    columns: [
      { key: "voucher_date", label: "Date", type: "date" },
      { key: "voucher_type", label: "Voucher Type", type: "text" },
      { key: "voucher_no", label: "Voucher No", type: "text" },
      { key: "narration", label: "Narration", type: "text" },
      { key: "debit", label: "Debit", type: "money" },
      { key: "credit", label: "Credit", type: "money" },
      { key: "balance", label: "Balance", type: "running" },
    ],
  },
  {
    key: "trial_balance",
    title: "Trial Balance",
    group: "Accounting",
    description: "Opening, period movement and closing balances per account, with cost-center filter.",
    filters: ["company", "costCenter", "dateRange", "account"],
    columns: [
      { key: "account_code", label: "Account", type: "text" },
      { key: "account_name", label: "Account Name", type: "text" },
      { key: "opening_dr", label: "Opening Dr", type: "money" },
      { key: "opening_cr", label: "Opening Cr", type: "money" },
      { key: "period_dr", label: "Period Dr", type: "money" },
      { key: "period_cr", label: "Period Cr", type: "money" },
      { key: "closing_dr", label: "Closing Dr", type: "money" },
      { key: "closing_cr", label: "Closing Cr", type: "money" },
    ],
  },
  {
    key: "accounts_receivable",
    title: "Accounts Receivable",
    group: "Accounting",
    description: "Customer / receivable balances as of a date.",
    filters: ["company", "costCenter", "asOfDate", "account"],
    columns: [
      { key: "account_code", label: "Account", type: "text" },
      { key: "account_name", label: "Name", type: "text" },
      { key: "debit", label: "Debit", type: "money" },
      { key: "credit", label: "Credit", type: "money" },
      { key: "balance", label: "Balance", type: "money" },
    ],
  },
  {
    key: "accounts_payable",
    title: "Accounts Payable",
    group: "Accounting",
    description: "Vendor / payable balances as of a date.",
    filters: ["company", "costCenter", "asOfDate", "account"],
    columns: [
      { key: "account_code", label: "Account", type: "text" },
      { key: "account_name", label: "Name", type: "text" },
      { key: "debit", label: "Debit", type: "money" },
      { key: "credit", label: "Credit", type: "money" },
      { key: "balance", label: "Balance", type: "money" },
    ],
  },
  {
    key: "customer_aging",
    title: "Customer Aging",
    group: "Accounting",
    description: "Outstanding receivable balances aged into 0-30 to 180+ day buckets.",
    filters: ["company", "costCenter", "asOfDate", "accountRange"],
    columns: [
      { key: "account_code", label: "Account ID", type: "text" },
      { key: "account_name", label: "Name", type: "text" },
      { key: "0_30", label: "0-30", type: "money" },
      { key: "31_60", label: "31-60", type: "money" },
      { key: "61_90", label: "61-90", type: "money" },
      { key: "91_120", label: "91-120", type: "money" },
      { key: "121_150", label: "121-150", type: "money" },
      { key: "151_180", label: "150-180", type: "money" },
      { key: "180_plus", label: "180+", type: "money" },
      { key: "closing_balance", label: "Closing Balance", type: "money" },
    ],
  },
  {
    key: "vendor_aging",
    title: "Vendor Aging",
    group: "Accounting",
    description: "Outstanding payable balances aged into 0-30 to 180+ day buckets.",
    filters: ["company", "costCenter", "asOfDate", "accountRange"],
    columns: [
      { key: "account_code", label: "Account ID", type: "text" },
      { key: "account_name", label: "Name", type: "text" },
      { key: "0_30", label: "0-30", type: "money" },
      { key: "31_60", label: "31-60", type: "money" },
      { key: "61_90", label: "61-90", type: "money" },
      { key: "91_120", label: "91-120", type: "money" },
      { key: "121_150", label: "121-150", type: "money" },
      { key: "151_180", label: "150-180", type: "money" },
      { key: "180_plus", label: "180+", type: "money" },
      { key: "closing_balance", label: "Closing Balance", type: "money" },
    ],
  },
  {
    key: "item_wise_sale",
    title: "Item Wise Sale",
    group: "Sales",
    description: "Quantity and amount sold per item.",
    filters: ["company", "costCenter", "dateRange", "itemRange"],
    columns: [
      { key: "item_id", label: "Item ID", type: "text" },
      { key: "item_name", label: "Item Name", type: "text" },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
  },
  {
    key: "customer_wise_sale",
    title: "Customer Wise Sale",
    group: "Sales",
    description: "Total sales per customer account.",
    filters: ["company", "costCenter", "dateRange", "customerRange"],
    columns: [
      { key: "account_code", label: "Account", type: "text" },
      { key: "name", label: "Customer", type: "text" },
      { key: "invoices", label: "Invoices", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
  },
  {
    key: "top_items_sales",
    title: "Top Items Sales",
    group: "Sales",
    description: "Best-selling items by amount.",
    filters: ["company", "costCenter", "dateRange", "topN"],
    columns: [
      { key: "item_id", label: "Item ID", type: "text" },
      { key: "item_name", label: "Item Name", type: "text" },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
  },
  {
    key: "customer_item_wise_sale",
    title: "Customer Item Wise Sale",
    group: "Sales",
    description: "Sales broken down by customer and item.",
    filters: ["company", "costCenter", "dateRange", "customer", "item"],
    columns: [
      { key: "account_code", label: "Account", type: "text" },
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "item_id", label: "Item ID", type: "text" },
      { key: "item_name", label: "Item Name", type: "text" },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
  },
  {
    key: "item_wise_purchase",
    title: "Item Wise Purchase",
    group: "Purchases",
    description: "Quantity and amount purchased per item.",
    filters: ["company", "costCenter", "dateRange", "itemRange"],
    columns: [
      { key: "item_id", label: "Item ID", type: "text" },
      { key: "item_name", label: "Item Name", type: "text" },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
  },
  {
    key: "vendor_wise_purchase",
    title: "Vendor Wise Purchase",
    group: "Purchases",
    description: "Total purchases per vendor.",
    filters: ["company", "costCenter", "dateRange", "vendorRange"],
    columns: [
      { key: "vendor_code", label: "Vendor", type: "text" },
      { key: "name", label: "Vendor Name", type: "text" },
      { key: "invoices", label: "Invoices", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
  },
];

// Helper function to normalize keys (convert dashes to underscores)
// This allows both URL format and database format to work
export const REPORT_MAP = Object.fromEntries(
  REPORTS.map((r) => [r.key, r])
);

// Also create a normalized map for URL-based lookups
export const REPORT_MAP_NORMALIZED = Object.fromEntries(
  REPORTS.map((r) => [r.key.replace(/_/g, "-"), r])
);

// Combined lookup function - tries exact match first, then normalized
export function getReportByKey(key) {
  if (!key) return undefined;
  return REPORT_MAP[key] || REPORT_MAP_NORMALIZED[key] || undefined;
}