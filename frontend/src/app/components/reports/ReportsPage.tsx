import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, TrendingDown, ShoppingBag, Receipt, Users, Calendar,
  Download, Printer, FileSpreadsheet, FileText, Search, Filter,
  RefreshCw, CheckCircle2, AlertCircle, Eye, X, ArrowUpRight,
  ArrowDownRight, Package, UserCheck, ShieldCheck, CreditCard,
  Building2, Sparkles, ChevronDown, ChevronLeft, ChevronRight, BarChart2, PieChart as PieChartIcon,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { toast } from "sonner";
import {
  api,
  resolveBackendUrl,
  ReportsSummaryResponse,
  SalesOverviewPoint,
  CategorySalesReport,
  BestSellerReportItem,
  CustomerActivityReport,
  StaffPerformanceItem,
  PaymentMethodsReport,
  ReportTransactionItem,
  ReturnsAnalyticsReport,
  ReportReturnItem,
} from "../../../api";
import logoImg from "../../../assets/SmartMart_Logo.jpg";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const peso = (n: number | string) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompactNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
};

const formatDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type PresetRange = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "this_year" | "custom" | "custom_month";

const MONTH_OPTIONS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

const CATEGORY_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899",
  "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#84cc16",
  "#e11d48", "#64748b", "#d97706", "#0284c7", "#9333ea"
];

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; bg: string; text: string; iconBg: string }> = {
  Cash: { label: "Cash (Walk-in)", bg: "bg-emerald-50", text: "text-emerald-700 border-emerald-200", iconBg: "bg-emerald-500" },
};

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

const CustomOverviewTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card p-3.5 rounded-xl border border-border shadow-xl text-xs space-y-1.5 min-w-[160px] text-foreground">
        <p className="font-extrabold text-foreground border-b border-border pb-1">{label || data.label}</p>
        <div className="flex items-center justify-between text-emerald-500 font-bold">
          <span>Sales:</span>
          <span className="font-mono">{peso(data.total_sales)}</span>
        </div>
        <div className="flex items-center justify-between text-blue-500 font-medium">
          <span>Transactions:</span>
          <span className="font-mono">{data.total_transactions} trx</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card p-3 rounded-xl border border-border shadow-xl text-xs space-y-1 text-foreground">
        <p className="font-extrabold text-foreground">{data.category}</p>
        <p className="text-emerald-500 font-mono font-bold">{peso(data.revenue)}</p>
        <p className="text-muted-foreground">{data.items_sold} items ({data.percentage}%)</p>
      </div>
    );
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  // Date range state
  const [preset, setPreset] = useState<PresetRange>("this_month");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return formatDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [toDate, setToDate] = useState<string>(() => formatDateStr(new Date()));
  const [appliedDates, setAppliedDates] = useState<{ from: string; to: string }>({
    from: formatDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: formatDateStr(new Date()),
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const availableYears = useMemo(() => {
    const curYear = new Date().getFullYear();
    const minYear = Math.min(2020, curYear - 6, selectedYear);
    const maxYear = Math.max(curYear + 2, 2030, selectedYear);
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [selectedYear]);

  // Granularity for overview chart
  const [overviewGroupBy, setOverviewGroupBy] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  // Sorting and filtering state
  const [bestSellerSort, setBestSellerSort] = useState<"quantity" | "revenue">("revenue");
  const [txSearch, setTxSearch] = useState("");
  const [txPaymentFilter, setTxPaymentFilter] = useState("All");

  // Data states
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReportsSummaryResponse | null>(null);
  const [salesOverview, setSalesOverview] = useState<SalesOverviewPoint[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesReport | null>(null);
  const [bestSellers, setBestSellers] = useState<BestSellerReportItem[]>([]);
  const [customerActivity, setCustomerActivity] = useState<CustomerActivityReport | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsReport | null>(null);
  const [transactions, setTransactions] = useState<ReportTransactionItem[]>([]);
  const [returnsData, setReturnsData] = useState<ReturnsAnalyticsReport | null>(null);
  const [returnSearch, setReturnSearch] = useState("");
  const [returnStatusFilter, setReturnStatusFilter] = useState("All");
  const [selectedReturnDetail, setSelectedReturnDetail] = useState<ReportReturnItem | null>(null);

  // Client-side sort for best sellers
  const sortedBestSellers = useMemo(() => {
    return [...bestSellers].sort((a, b) => {
      if (bestSellerSort === "revenue") {
        return b.total_revenue - a.total_revenue || b.quantity_sold - a.quantity_sold;
      }
      return b.quantity_sold - a.quantity_sold || b.total_revenue - a.total_revenue;
    });
  }, [bestSellers, bestSellerSort]);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<ReportTransactionItem | null>(null);
  const [receiptItems, setReceiptItems] = useState<Array<{ product_name: string; quantity: number; unit_price: number; subtotal: number }>>([]);
  const [loadingReceiptItems, setLoadingReceiptItems] = useState(false);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Calculate preset dates
  const handleSelectPreset = (p: PresetRange) => {
    setPreset(p);
    const now = new Date();
    let f = new Date();
    let t = new Date();

    if (p === "today") {
      f = new Date(now);
      t = new Date(now);
    } else if (p === "yesterday") {
      f = new Date(now);
      f.setDate(f.getDate() - 1);
      t = new Date(f);
    } else if (p === "this_week") {
      const day = now.getDay();
      const diff = (day + 6) % 7; // Monday as 0
      f = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      t = new Date(f.getTime() + 6 * 24 * 60 * 60 * 1000);
    } else if (p === "this_month") {
      f = new Date(now.getFullYear(), now.getMonth(), 1);
      t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (p === "last_month") {
      f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      t = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (p === "this_year") {
      f = new Date(now.getFullYear(), 0, 1);
      t = new Date(now.getFullYear(), 11, 31);
    } else if (p === "custom_month") {
      let y = selectedYear;
      let m = selectedMonth;
      if (appliedDates.from) {
        const parts = appliedDates.from.split("-");
        if (parts.length === 3) {
          const parsedY = parseInt(parts[0], 10);
          const parsedM = parseInt(parts[1], 10) - 1;
          if (!isNaN(parsedY) && !isNaN(parsedM) && parsedM >= 0 && parsedM <= 11) {
            y = parsedY;
            m = parsedM;
            setSelectedYear(y);
            setSelectedMonth(m);
          }
        }
      }
      f = new Date(y, m, 1);
      t = new Date(y, m + 1, 0);
      const fromStr = formatDateStr(f);
      const toStr = formatDateStr(t);
      setFromDate(fromStr);
      setToDate(toStr);
      setAppliedDates({ from: fromStr, to: toStr });
    }

    if (p !== "custom" && p !== "custom_month") {
      const fromStr = formatDateStr(f);
      const toStr = formatDateStr(t);
      setFromDate(fromStr);
      setToDate(toStr);
      setAppliedDates({ from: fromStr, to: toStr });
    }
  };

  const handleApplyCustomFilter = () => {
    if (!fromDate || !toDate) {
      toast.error("Please specify both From and To dates.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error("'From' date cannot be after 'To' date.");
      return;
    }
    setAppliedDates({ from: fromDate, to: toDate });
    toast.success("Date filter applied!");
  };

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    const f = new Date(selectedYear, newMonth, 1);
    const t = new Date(selectedYear, newMonth + 1, 0);
    const fromStr = formatDateStr(f);
    const toStr = formatDateStr(t);
    setFromDate(fromStr);
    setToDate(toStr);
    setAppliedDates({ from: fromStr, to: toStr });
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const f = new Date(newYear, selectedMonth, 1);
    const t = new Date(newYear, selectedMonth + 1, 0);
    const fromStr = formatDateStr(f);
    const toStr = formatDateStr(t);
    setFromDate(fromStr);
    setToDate(toStr);
    setAppliedDates({ from: fromStr, to: toStr });
  };

  const handlePrevMonth = () => {
    let nextMonth = selectedMonth - 1;
    let nextYear = selectedYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
    const f = new Date(nextYear, nextMonth, 1);
    const t = new Date(nextYear, nextMonth + 1, 0);
    const fromStr = formatDateStr(f);
    const toStr = formatDateStr(t);
    setFromDate(fromStr);
    setToDate(toStr);
    setAppliedDates({ from: fromStr, to: toStr });
  };

  const handleNextMonth = () => {
    let nextMonth = selectedMonth + 1;
    let nextYear = selectedYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
    const f = new Date(nextYear, nextMonth, 1);
    const t = new Date(nextYear, nextMonth + 1, 0);
    const fromStr = formatDateStr(f);
    const toStr = formatDateStr(t);
    setFromDate(fromStr);
    setToDate(toStr);
    setAppliedDates({ from: fromStr, to: toStr });
  };

  const handleApplyMonthFilter = () => {
    const f = new Date(selectedYear, selectedMonth, 1);
    const t = new Date(selectedYear, selectedMonth + 1, 0);
    const fromStr = formatDateStr(f);
    const toStr = formatDateStr(t);
    setFromDate(fromStr);
    setToDate(toStr);
    setAppliedDates({ from: fromStr, to: toStr });
    const monthName = MONTH_OPTIONS[selectedMonth]?.label || "";
    toast.success(`Filter applied for ${monthName} ${selectedYear}!`);
  };

  const handleResetMonthFilter = () => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    setSelectedMonth(curMonth);
    setSelectedYear(curYear);
    const f = new Date(curYear, curMonth, 1);
    const t = new Date(curYear, curMonth + 1, 0);
    const fromStr = formatDateStr(f);
    const toStr = formatDateStr(t);
    setFromDate(fromStr);
    setToDate(toStr);
    setAppliedDates({ from: fromStr, to: toStr });
    toast.info(`Reset to current month (${MONTH_OPTIONS[curMonth]?.label || ""} ${curYear})`);
  };

  const handleResetFilter = () => {
    handleSelectPreset("this_month");
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
    setTxSearch("");
    setTxPaymentFilter("All");
    setBestSellerSort("revenue");
    toast.info("Report filters reset to This Month.");
  };

  // Fetch all reports data based on applied dates
  const loadReportsData = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const { from, to } = appliedDates;
      const [
        sumRes,
        overviewRes,
        catRes,
        bestRes,
        custRes,
        staffRes,
        payRes,
        txRes,
        returnsRes,
      ] = await Promise.all([
        api.reports.getSummary(from, to),
        api.reports.getSalesOverview(from, to, overviewGroupBy),
        api.reports.getSalesByCategory(from, to),
        api.reports.getBestSellers(from, to, "revenue", 50),
        api.reports.getCustomerActivity(from, to),
        api.reports.getStaffPerformance(from, to),
        api.reports.getPaymentMethods(from, to),
        api.reports.getTransactions({ from, to }),
        api.reports.getReturnsAnalytics(from, to),
      ]);

      setSummary(sumRes);
      setSalesOverview(overviewRes);
      setCategorySales(catRes);
      setBestSellers(bestRes);
      setCustomerActivity(custRes);
      setStaffPerformance(staffRes);
      setPaymentMethods(payRes);
      setTransactions(txRes);
      setReturnsData(returnsRes);
    } catch (err: any) {
      console.error("Failed to load reports data:", err);
      setError(err.message || "Unable to load report data. Please try again.");
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [appliedDates]);

  useEffect(() => {
    loadReportsData(true);
  }, [appliedDates]);

  // Dedicated effect for overview chart granularity switch
  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    let active = true;
    (async () => {
      setLoadingOverview(true);
      try {
        const overviewRes = await api.reports.getSalesOverview(appliedDates.from, appliedDates.to, overviewGroupBy);
        if (active) setSalesOverview(overviewRes);
      } catch (err) {
        console.error("Failed to update sales overview:", err);
      } finally {
        if (active) setLoadingOverview(false);
      }
    })();
    return () => { active = false; };
  }, [overviewGroupBy]);

  // Open receipt details
  const handleOpenReceipt = async (tx: ReportTransactionItem) => {
    setSelectedReceipt(tx);
    setLoadingReceiptItems(true);
    try {
      const items: any = await api.transactions.getItems(tx.id);
      setReceiptItems(
        items.map((i: any) => ({
          product_name: i.product_name,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          subtotal: Number(i.subtotal),
        }))
      );
    } catch (err) {
      console.error("Failed to load receipt items:", err);
      setReceiptItems([]);
    } finally {
      setLoadingReceiptItems(false);
    }
  };

  // Filtered transactions list
  const displayedTransactions = useMemo(() => {
    let result = transactions;
    if (txPaymentFilter !== "All") {
      result = result.filter(t => t.payment_method === txPaymentFilter);
    }
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase().trim();
      result = result.filter(
        t =>
          (t.receipt_no && t.receipt_no.toLowerCase().includes(q)) ||
          (t.customer && t.customer.toLowerCase().includes(q)) ||
          (t.cashier && t.cashier.toLowerCase().includes(q)) ||
          (t.customer_code && t.customer_code.toLowerCase().includes(q)) ||
          (t.staff_code && t.staff_code.toLowerCase().includes(q))
      );
    }
    return result;
  }, [transactions, txPaymentFilter, txSearch]);

  // Filtered returns list
  const filteredReturns = useMemo(() => {
    if (!returnsData) return [];
    let result = returnsData.returns_list;
    if (returnStatusFilter !== "All") {
      result = result.filter(r => r.status === returnStatusFilter);
    }
    if (returnSearch.trim()) {
      const q = returnSearch.toLowerCase().trim();
      result = result.filter(
        r =>
          (r.return_no && r.return_no.toLowerCase().includes(q)) ||
          (r.receipt_no && r.receipt_no.toLowerCase().includes(q)) ||
          (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
          (r.customer_code && r.customer_code.toLowerCase().includes(q)) ||
          (r.reason && r.reason.toLowerCase().includes(q)) ||
          (r.returned_items_summary && r.returned_items_summary.toLowerCase().includes(q))
      );
    }
    return result;
  }, [returnsData, returnStatusFilter, returnSearch]);

  // Return status color helper
  const getReturnStatusStyle = (status: string) => {
    switch (status) {
      case "Pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Approved": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected": return "bg-red-50 text-red-700 border-red-200";
      case "Cancelled": return "bg-gray-100 text-gray-500 border-gray-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!summary) return;
    const { from, to } = appliedDates;
    const nowStr = new Date().toLocaleString();

    let csv = `SmartMart - Reports & Analytics Export\n`;
    csv += `Date Range: ${from} to ${to}\n`;
    csv += `Generated On: ${nowStr}\n\n`;

    csv += `--- SUMMARY STATISTICS ---\n`;
    csv += `Total Sales,${summary.current.total_sales}\n`;
    csv += `Total Transactions,${summary.current.total_transactions}\n`;
    csv += `Products Sold,${summary.current.products_sold}\n`;
    csv += `Customers Served,${summary.current.customers_served}\n\n`;

    csv += `--- CATEGORY SALES ---\n`;
    csv += `Category,Items Sold,Revenue,Percentage\n`;
    categorySales?.categories.forEach(c => {
      csv += `"${c.category}",${c.items_sold},${c.revenue},${c.percentage}%\n`;
    });
    csv += `\n`;

    csv += `--- BEST SELLING PRODUCTS ---\n`;
    csv += `Product,Category,Price,Quantity Sold,Total Revenue,Current Stock\n`;
    bestSellers.forEach(p => {
      csv += `"${p.name.replace(/"/g, '""')}","${p.category}",${p.price},${p.quantity_sold},${p.total_revenue},${p.stock}\n`;
    });
    csv += `\n`;

    csv += `--- TRANSACTION HISTORY ---\n`;
    csv += `Receipt No,Date,Customer,Cashier,Items,Total Amount,Payment Method,Status\n`;
    displayedTransactions.forEach(t => {
      csv += `"${t.receipt_no}","${t.date}","${t.customer.replace(/"/g, '""')}","${t.cashier.replace(/"/g, '""')}",${t.items_count},${t.total_amount},"${t.payment_method}","${t.status}"\n`;
    });
    csv += `\n`;

    if (returnsData) {
      csv += `--- RETURNS & REFUNDS SUMMARY ---\n`;
      csv += `Total Return Requests,${returnsData.summary.total_returns}\n`;
      csv += `Pending Requests,${returnsData.summary.pending_count}\n`;
      csv += `Approved / Done Requests,${returnsData.summary.approved_count}\n`;
      csv += `Rejected Requests,${returnsData.summary.rejected_count}\n`;
      csv += `Total Refunded Amount,${returnsData.summary.total_refunded}\n`;
      csv += `Total Items Returned,${returnsData.summary.items_returned_count}\n\n`;

      if (returnsData.reasons && returnsData.reasons.length > 0) {
        csv += `--- RETURN REASONS BREAKDOWN ---\n`;
        csv += `Reason,Count,Refund Amount,Items Returned\n`;
        returnsData.reasons.forEach(r => {
          csv += `"${(r.reason || "").replace(/"/g, '""')}",${r.count},${r.refund_amount},${r.items_count}\n`;
        });
        csv += `\n`;
      }

      if (returnsData.top_returned_products && returnsData.top_returned_products.length > 0) {
        csv += `--- TOP RETURNED PRODUCTS ---\n`;
        csv += `Product Name,Category,Return Incidents,Quantity Returned,Total Refund Amount,Restocked Quantity\n`;
        returnsData.top_returned_products.forEach(p => {
          csv += `"${(p.product_name || "").replace(/"/g, '""')}","${(p.category || "").replace(/"/g, '""')}",${p.return_occurrences},${p.total_quantity_returned},${p.total_refund_amount},${p.total_restocked_quantity}\n`;
        });
        csv += `\n`;
      }

      const returnList = returnsData.returns_list || [];
      if (returnList.length > 0) {
        csv += `--- RETURN REQUESTS & RETURNED ITEMS LOG ---\n`;
        csv += `Return No,Date,Receipt No,Customer Name,Customer Code,Reason,Returned Items Summary,Quantity Returned,Refund Amount,Status,Customer Notes,Admin Notes\n`;
        returnList.forEach(r => {
          const custNotes = (r.customer_notes || "").replace(/"/g, '""');
          const admNotes = (r.admin_notes || "").replace(/"/g, '""');
          const itemsSummary = (r.returned_items_summary || "").replace(/"/g, '""');
          csv += `"${r.return_no}","${r.date}","${r.receipt_no}","${(r.customer_name || "").replace(/"/g, '""')}","${r.customer_code || ""}","${(r.reason || "").replace(/"/g, '""')}","${itemsSummary}",${r.total_items_quantity || r.items_count || 1},${r.refund_amount},"${r.status}","${custNotes}","${admNotes}"\n`;
        });
        csv += `\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SmartMart_Report_${from}_to_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    toast.success("CSV Report downloaded successfully!");
  };

  const handleExportPrint = () => {
    setShowExportMenu(false);
    if (!summary) {
      toast.error("Report data is still loading.");
      return;
    }

    const { from, to } = appliedDates;
    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const categoryRows = (categorySales?.categories || [])
      .map(
        c => `
        <tr>
          <td>${c.category}</td>
          <td class="text-center font-mono">${c.items_sold}</td>
          <td class="text-right font-mono font-bold">₱${c.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right font-mono">${c.percentage}%</td>
        </tr>`
      )
      .join("");

    const bestSellerRows = sortedBestSellers
      .slice(0, 15)
      .map(
        (p, idx) => `
        <tr>
          <td class="text-center font-mono font-bold text-muted">#${idx + 1}</td>
          <td class="font-bold">${p.name}</td>
          <td>${p.category}</td>
          <td class="text-right font-mono">₱${p.price.toFixed(2)}</td>
          <td class="text-center font-mono font-bold">${p.quantity_sold}</td>
          <td class="text-right font-mono font-bold">₱${p.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`
      )
      .join("");

    const staffRows = staffPerformance
      .map(
        s => `
        <tr>
          <td class="font-bold">${s.name} <span class="text-muted font-mono">(${s.staff_code})</span></td>
          <td>${s.role}</td>
          <td class="text-center font-mono">${s.transactions_count}</td>
          <td class="text-right font-mono font-bold">₱${s.total_sales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right font-mono">₱${s.avg_transaction_value.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const recentTxRows = transactions
      .slice(0, 20)
      .map(
        t => `
        <tr>
          <td class="font-mono font-bold text-primary">${t.receipt_no}</td>
          <td class="font-mono text-sm">${t.date}</td>
          <td>${t.customer}</td>
          <td>${t.cashier}</td>
          <td class="text-center font-mono">${t.items_count}</td>
          <td class="text-right font-mono font-bold">₱${t.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-center"><span class="badge">Cash (Walk-in)</span></td>
          <td class="text-center">${t.status}</td>
        </tr>`
      )
      .join("");

    const returnReasonRows = (returnsData?.reasons || [])
      .map(
        r => `
        <tr>
          <td>${r.reason}</td>
          <td class="text-center font-mono">${r.count}</td>
          <td class="text-center font-mono">${r.items_count}</td>
          <td class="text-right font-mono font-bold">₱${r.refund_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`
      )
      .join("");

    const topReturnedRows = (returnsData?.top_returned_products || [])
      .slice(0, 10)
      .map(
        p => `
        <tr>
          <td class="font-bold">${p.product_name}</td>
          <td>${p.category}</td>
          <td class="text-center font-mono font-bold">${p.return_occurrences}</td>
          <td class="text-center font-mono font-bold" style="color:#b91c1c">${p.total_quantity_returned}</td>
          <td class="text-center font-mono font-bold" style="color:#047857">${p.total_restocked_quantity}</td>
          <td class="text-right font-mono font-bold">₱${p.total_refund_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`
      )
      .join("");

    const returnLogRows = (returnsData?.returns_list || [])
      .slice(0, 25)
      .map(
        r => {
          let badgeClass = "badge-pending";
          if (r.status === "Approved") badgeClass = "badge-approved";
          else if (r.status === "Completed") badgeClass = "badge-completed";
          else if (r.status === "Rejected") badgeClass = "badge-rejected";
          else if (r.status === "Cancelled") badgeClass = "badge-cancelled";

          return `
          <tr>
            <td class="font-mono font-bold" style="color:#ea580c">${r.return_no}</td>
            <td class="font-mono text-sm">${r.date}</td>
            <td class="font-mono text-muted">${r.receipt_no}</td>
            <td><strong>${r.customer_name}</strong> <span class="text-muted font-mono">(${r.customer_code})</span></td>
            <td>${r.returned_items_summary || "—"}</td>
            <td>${r.reason}</td>
            <td class="text-center font-mono font-bold">${r.total_items_quantity || r.items_count || 1}</td>
            <td class="text-right font-mono font-bold">₱${Number(r.refund_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center"><span class="badge ${badgeClass}">${r.status}</span></td>
          </tr>`;
        }
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SmartMart Executive Sales & Operations Report (${from} to ${to})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            font-size: 9pt;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            border-bottom: 2.5px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .logo-area h1 {
            font-size: 20pt;
            font-weight: 900;
            color: #065f46;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .logo-area p {
            font-size: 8.5pt;
            color: #4b5563;
            margin-top: 3px;
          }
          .meta-area {
            text-align: right;
          }
          .meta-area h2 {
            font-size: 12pt;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-info {
            font-size: 8.5pt;
            color: #4b5563;
            margin-top: 4px;
            line-height: 1.5;
          }
          .kpi-container {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .kpi-box {
            border: 1.5px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 12px;
            background: #f9fafb;
          }
          .kpi-title {
            font-size: 7.5pt;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kpi-value {
            font-size: 13pt;
            font-weight: 900;
            color: #065f46;
            font-family: "Courier New", Courier, monospace;
            margin-top: 3px;
          }
          .kpi-sub {
            font-size: 7.5pt;
            color: #059669;
            font-weight: 600;
            margin-top: 2px;
          }
          .section {
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .section-heading {
            font-size: 9pt;
            font-weight: 800;
            color: #065f46;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1.5px solid #d1fae5;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
          }
          th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 7.5pt;
            letter-spacing: 0.3px;
            padding: 5px 8px;
            border-top: 1px solid #d1d5db;
            border-bottom: 1.5px solid #9ca3af;
            text-align: left;
          }
          td {
            padding: 4.5px 8px;
            border-bottom: 1px solid #e5e7eb;
            color: #1f2937;
          }
          tr:nth-child(even) td {
            background: #fafafa;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: "Courier New", Courier, monospace; }
          .font-bold { font-weight: 700; }
          .text-muted { color: #6b7280; }
          .text-primary { color: #0284c7; }
          .badge {
            background: #ecfdf5;
            color: #047857;
            font-weight: 700;
            font-size: 7pt;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #a7f3d0;
          }
          .badge-pending {
            background: #fffbeb;
            color: #b45309;
            border: 1px solid #fde68a;
          }
          .badge-approved {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }
          .badge-completed {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
          }
          .badge-rejected {
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .badge-cancelled {
            background: #f3f4f6;
            color: #6b7280;
            border: 1px solid #e5e7eb;
          }
          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .sign-area {
            margin-top: 24px;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sign-box {
            width: 42%;
            text-align: center;
          }
          .sign-line {
            border-top: 1px solid #374151;
            margin-top: 36px;
            padding-top: 5px;
            font-size: 8.5pt;
            font-weight: 700;
            color: #111827;
          }
          .sign-role {
            font-size: 7.5pt;
            color: #6b7280;
          }
          .footer {
            margin-top: 18px;
            border-top: 1px solid #e5e7eb;
            padding-top: 6px;
            font-size: 7pt;
            color: #9ca3af;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <h1>SMARTMART</h1>
            <p><strong>SmartMart Supermarket POS System</strong></p>
            <p>Zamora, Bilar, Bohol • Tel: 09704972414</p>
          </div>
          <div class="meta-area">
            <h2>Sales & Operations Report</h2>
            <div class="meta-info">
              <div><strong>Period:</strong> ${from} &nbsp;to&nbsp; ${to}</div>
              <div><strong>Generated:</strong> ${nowStr}</div>
              <div><strong>Channel:</strong> Physical In-Store POS (Walk-in Cash Only)</div>
            </div>
          </div>
        </div>

        <div class="kpi-container">
          <div class="kpi-box">
            <div class="kpi-title">Total Gross Sales</div>
            <div class="kpi-value">₱${summary.current.total_sales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">${summary.growth.sales_pct >= 0 ? "+" : ""}${summary.growth.sales_pct}% vs prev period</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">POS Transactions</div>
            <div class="kpi-value">${summary.current.total_transactions.toLocaleString()}</div>
            <div class="kpi-sub">${summary.growth.transactions_pct >= 0 ? "+" : ""}${summary.growth.transactions_pct}% vs prev period</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Products Sold</div>
            <div class="kpi-value">${summary.current.products_sold.toLocaleString()} <span style="font-size:7.5pt;color:#6b7280">items</span></div>
            <div class="kpi-sub">${summary.growth.products_sold_pct >= 0 ? "+" : ""}${summary.growth.products_sold_pct}% vs prev period</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Customers Served</div>
            <div class="kpi-value">${summary.current.customers_served.toLocaleString()}</div>
            <div class="kpi-sub">100% Cash Settled</div>
          </div>
        </div>

        <div class="two-col">
          <div class="section">
            <div class="section-heading">Sales by Product Category</div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th class="text-center">Units</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                ${categoryRows || '<tr><td colspan="4" class="text-center text-muted">No category sales recorded</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-heading">Staff Cashier Throughput</div>
            <table>
              <thead>
                <tr>
                  <th>Cashier</th>
                  <th>Role</th>
                  <th class="text-center">Trx</th>
                  <th class="text-right">Processed</th>
                  <th class="text-right">Avg Trx</th>
                </tr>
              </thead>
              <tbody>
                ${staffRows || '<tr><td colspan="5" class="text-center text-muted">No staff activity recorded</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-heading">Top Best-Selling Products</div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width:36px">Rank</th>
                <th>Product Name</th>
                <th>Category</th>
                <th class="text-right">Unit Price</th>
                <th class="text-center">Qty Sold</th>
                <th class="text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${bestSellerRows || '<tr><td colspan="6" class="text-center text-muted">No product sales recorded</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-heading">Recent In-Store POS Transactions (Sample Log)</div>
          <table>
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th class="text-center">Items</th>
                <th class="text-right">Total Amount</th>
                <th class="text-center">Payment</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${recentTxRows || '<tr><td colspan="8" class="text-center text-muted">No transactions recorded</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section" style="margin-top: 18px;">
          <div class="section-heading" style="color: #c2410c; border-bottom-color: #ffedd5;">
            Product Returns & Refunds Summary
          </div>
          <div class="kpi-container" style="grid-template-columns: repeat(6, 1fr); margin-bottom: 12px;">
            <div class="kpi-box" style="border-color: #ffedd5; background: #fffaf5;">
              <div class="kpi-title" style="color: #9a3412;">Total Returns</div>
              <div class="kpi-value" style="color: #c2410c;">${returnsData?.summary.total_returns ?? 0}</div>
              <div class="kpi-sub" style="color: #ea580c;">Total requests</div>
            </div>
            <div class="kpi-box" style="border-color: #ffedd5; background: #fffaf5;">
              <div class="kpi-title" style="color: #9a3412;">Pending</div>
              <div class="kpi-value" style="color: #d97706;">${returnsData?.summary.pending_count ?? 0}</div>
              <div class="kpi-sub" style="color: #b45309;">Awaiting action</div>
            </div>
            <div class="kpi-box" style="border-color: #ffedd5; background: #fffaf5;">
              <div class="kpi-title" style="color: #9a3412;">Approved / Done</div>
              <div class="kpi-value" style="color: #047857;">${returnsData?.summary.approved_count ?? 0}</div>
              <div class="kpi-sub" style="color: #059669;">Resolved</div>
            </div>
            <div class="kpi-box" style="border-color: #ffedd5; background: #fffaf5;">
              <div class="kpi-title" style="color: #9a3412;">Rejected</div>
              <div class="kpi-value" style="color: #dc2626;">${returnsData?.summary.rejected_count ?? 0}</div>
              <div class="kpi-sub" style="color: #b91c1c;">Declined</div>
            </div>
            <div class="kpi-box" style="border-color: #ffedd5; background: #fffaf5;">
              <div class="kpi-title" style="color: #9a3412;">Total Refunded</div>
              <div class="kpi-value" style="color: #c2410c;">₱${(returnsData?.summary.total_refunded ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="kpi-sub" style="color: #ea580c;">Cash refunded</div>
            </div>
            <div class="kpi-box" style="border-color: #ffedd5; background: #fffaf5;">
              <div class="kpi-title" style="color: #9a3412;">Items Returned</div>
              <div class="kpi-value" style="color: #c2410c;">${returnsData?.summary.items_returned_count ?? 0} <span style="font-size:7.5pt;color:#6b7280">units</span></div>
              <div class="kpi-sub" style="color: #ea580c;">Physical units</div>
            </div>
          </div>
        </div>

        <div class="two-col" style="margin-bottom: 16px;">
          <div class="section">
            <div class="section-heading" style="color: #c2410c; border-bottom-color: #ffedd5;">Return Reasons Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th class="text-center">Requests</th>
                  <th class="text-center">Items</th>
                  <th class="text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                ${returnReasonRows || '<tr><td colspan="4" class="text-center text-muted">No return reasons recorded</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-heading" style="color: #c2410c; border-bottom-color: #ffedd5;">Top Returned Products</div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th class="text-center">Reqs</th>
                  <th class="text-center">Returned</th>
                  <th class="text-center">Restocked</th>
                  <th class="text-right">Refund</th>
                </tr>
              </thead>
              <tbody>
                ${topReturnedRows || '<tr><td colspan="6" class="text-center text-muted">No returned products recorded</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-heading" style="color: #c2410c; border-bottom-color: #ffedd5;">Return Requests & Returned Items Log</div>
          <table>
            <thead>
              <tr>
                <th>Return No.</th>
                <th>Date & Time</th>
                <th>Receipt No.</th>
                <th>Customer</th>
                <th>Returned Items</th>
                <th>Reason</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Refund</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${returnLogRows || '<tr><td colspan="9" class="text-center text-muted">No return records for this period</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="sign-area">
          <div class="sign-box">
            <div class="sign-line">Prepared by: Store Cashier Supervisor / Admin</div>
            <div class="sign-role">Date: ________________________</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Approved by: Store Operations Manager</div>
            <div class="sign-role">Date: ________________________</div>
          </div>
        </div>

        <div class="footer">
          <span>SmartMart POS Executive Reporting Engine • Internal Confidential Report</span>
          <span>Report Generated on ${nowStr}</span>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank", "width=950,height=800");
    if (printWin) {
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 400);
      toast.success("Executive PDF / Print document opened!");
    } else {
      toast.error("Please allow popups to print report.");
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedReceipt) return;

    const itemRows = receiptItems
      .map(
        i => `
        <tr>
          <td>${i.product_name}</td>
          <td class="text-center">${i.quantity}</td>
          <td class="text-right font-mono">₱${i.unit_price.toFixed(2)}</td>
          <td class="text-right font-mono">₱${i.subtotal.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${selectedReceipt.receipt_no}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "Courier New", Courier, monospace;
            font-size: 9pt;
            color: #000;
            width: 72mm;
            margin: 0 auto;
            line-height: 1.3;
          }
          .header { text-align: center; margin-bottom: 8px; }
          .header h2 { font-size: 13pt; font-weight: bold; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .meta { font-size: 8.5pt; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 6px 0; }
          th { border-bottom: 1px dashed #000; padding: 3px 0; text-align: left; }
          td { padding: 2px 0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals { font-size: 9pt; margin-top: 4px; }
          .totals-row { display: flex; justify-content: space-between; margin: 2px 0; }
          .grand-total { font-size: 11pt; font-weight: bold; }
          .footer { text-align: center; margin-top: 12px; font-size: 8pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SMARTMART</h2>
          <p>Zamora, Bilar, Bohol</p>
          <p>Tel: 09704972414</p>
        </div>
        <div class="divider"></div>
        <div class="meta">
          <p>Receipt No : ${selectedReceipt.receipt_no}</p>
          <p>Date & Time: ${selectedReceipt.date}</p>
          <p>Customer   : ${selectedReceipt.customer}</p>
          <p>Cashier    : ${selectedReceipt.cashier} (${selectedReceipt.staff_code})</p>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th class="text-center">QTY</th>
              <th class="text-right">PRICE</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="totals-row"><span>Subtotal:</span><span>₱${selectedReceipt.total_amount.toFixed(2)}</span></div>
          <div class="totals-row"><span>Discount:</span><span>₱0.00</span></div>
          <div class="totals-row grand-total"><span>TOTAL:</span><span>₱${selectedReceipt.total_amount.toFixed(2)}</span></div>
          <div class="totals-row"><span>Cash Tendered:</span><span>₱${selectedReceipt.cash_tendered.toFixed(2)}</span></div>
          <div class="totals-row"><span>Change:</span><span>₱${selectedReceipt.change_amount.toFixed(2)}</span></div>
          <div class="totals-row"><span>Payment Method:</span><span>Cash (Walk-in)</span></div>
          <div class="totals-row"><span>Status:</span><span>${selectedReceipt.status}</span></div>
        </div>
        <div class="divider"></div>
        <div class="footer">
          <p>THANK YOU FOR SHOPPING</p>
          <p>AT SMARTMART!</p>
          <p style="margin-top:4px;">Please keep this receipt for returns</p>
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=450,height=600");
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 350);
    }
  };

  const handleDownloadReceipt = () => {
    if (!selectedReceipt) return;
    let txt = `========================================\n`;
    txt += `               SMARTMART                \n`;
    txt += `          Zamora, Bilar, Bohol          \n`;
    txt += `       Contact: 09704972414             \n`;
    txt += `========================================\n`;
    txt += `Receipt No: ${selectedReceipt.receipt_no}\n`;
    txt += `Date & Time: ${selectedReceipt.date}\n`;
    txt += `Customer: ${selectedReceipt.customer}\n`;
    txt += `Cashier: ${selectedReceipt.cashier} (${selectedReceipt.staff_code})\n`;
    txt += `----------------------------------------\n`;
    txt += `ITEM                     QTY   PRICE   SUBTOTAL\n`;
    receiptItems.forEach(item => {
      const name = item.product_name.padEnd(23, " ").slice(0, 23);
      const qty = String(item.quantity).padStart(3, " ");
      const price = Number(item.unit_price).toFixed(2).padStart(7, " ");
      const sub = Number(item.subtotal).toFixed(2).padStart(8, " ");
      txt += `${name} ${qty} ${price} ${sub}\n`;
    });
    txt += `----------------------------------------\n`;
    txt += `Subtotal:                  ${peso(selectedReceipt.total_amount)}\n`;
    txt += `Discount:                  ₱0.00\n`;
    txt += `TOTAL:                     ${peso(selectedReceipt.total_amount)}\n`;
    txt += `Cash Tendered:             ${peso(selectedReceipt.cash_tendered)}\n`;
    txt += `Change:                    ${peso(selectedReceipt.change_amount)}\n`;
    txt += `Payment Method:            ${selectedReceipt.payment_method}\n`;
    txt += `Status:                    ${selectedReceipt.status}\n`;
    txt += `========================================\n`;
    txt += `     Thank you for shopping at SmartMart!   \n`;
    txt += `========================================\n`;

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt_${selectedReceipt.receipt_no}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded!");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 bg-background min-h-full font-sans text-foreground">
      
      {/* ─── 1. PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Reports & Analytics
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Monitor SmartMart's in-store sales, POS transactions, customer purchases, and staff activity.
              </p>
            </div>
          </div>
        </div>

        {/* Date / Actions Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-card border border-border rounded-xl text-xs font-semibold text-muted-foreground shadow-sm flex items-center gap-2">
            <Calendar size={14} className="text-emerald-500" />
            <span>Today: {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
          </div>

          {/* Export Report Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <Download size={16} /> Export Report <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-card rounded-2xl border border-border shadow-2xl z-30 p-1.5 space-y-1">
                <button
                  onClick={handleExportPrint}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Printer size={15} /> Export as PDF / Print
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet size={15} /> Export Full Report CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. DATE RANGE FILTER BAR ───────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {([
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["this_week", "This Week"],
              ["this_month", "This Month"],
              ["last_month", "Last Month"],
              ["this_year", "This Year"],
              ["custom", "Custom Date Range"],
              ["custom_month", "Custom Month"],
            ] as [PresetRange, string][]).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => handleSelectPreset(val)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  preset === val
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Active Period Label */}
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 self-end lg:self-auto">
            <span>Filtered Period:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
              {isRefreshing && <RefreshCw size={11} className="animate-spin text-emerald-600" />}
              {preset === "custom_month" ? (
                <>
                  <Calendar size={13} className="text-emerald-600 shrink-0" />
                  <span>{MONTH_OPTIONS[selectedMonth]?.label} {selectedYear}</span>
                  <span className="text-emerald-700/70 font-mono text-[11px] font-normal">({appliedDates.from} &nbsp;→&nbsp; {appliedDates.to})</span>
                </>
              ) : (
                <>
                  {appliedDates.from} &nbsp;→&nbsp; {appliedDates.to}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Custom Range Picker Controls */}
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyCustomFilter}
                className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
              >
                Apply Filter
              </button>
              <button
                onClick={handleResetFilter}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Custom Month & Year Picker Controls */}
        {preset === "custom_month" && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Prev / Next Month Step Controls */}
              <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="p-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-xs font-bold text-gray-700 select-none">
                  {MONTH_OPTIONS[selectedMonth]?.label} {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="p-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={e => handleMonthChange(Number(e.target.value))}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Year:</label>
                <select
                  value={selectedYear}
                  onChange={e => handleYearChange(Number(e.target.value))}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyMonthFilter}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={13} /> Apply Filter
                </button>
                <button
                  type="button"
                  onClick={handleResetMonthFilter}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Quick helper indicating period range */}
            <div className="text-[11px] text-gray-400 font-mono hidden md:flex items-center gap-1.5">
              <span>Period:</span>
              <span className="font-bold text-gray-600">{appliedDates.from} &nbsp;→&nbsp; {appliedDates.to}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── LOADING / ERROR STATES ────────────────────────────────────────── */}
      {initialLoading && !summary ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm animate-pulse space-y-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-7 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="h-72 bg-white rounded-2xl border border-gray-200 p-6 animate-pulse"></div>
        </div>
      ) : error && !summary ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle size={36} className="text-red-500 mx-auto" />
          <h3 className="text-base font-extrabold text-red-800">Unable to load report data</h3>
          <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => loadReportsData(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* ─── 2. SALES SUMMARY CARDS ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Sales */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <TrendingUp size={22} />
                </div>
                {summary?.growth.sales_pct !== undefined && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    summary.growth.sales_pct >= 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}>
                    {summary.growth.sales_pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(summary.growth.sales_pct)}% vs prev
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sales</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 font-mono tracking-tight">
                  {peso(summary?.current.total_sales || 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">From completed in-store POS sales</p>
              </div>
            </div>

            {/* Card 2: Total Transactions */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Receipt size={22} />
                </div>
                {summary?.growth.transactions_pct !== undefined && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    summary.growth.transactions_pct >= 0 ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30" : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}>
                    {summary.growth.transactions_pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(summary.growth.transactions_pct)}%
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Transactions</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 font-mono tracking-tight">
                  {(summary?.current.total_transactions || 0).toLocaleString()} <span className="text-xs text-muted-foreground font-sans font-semibold">Trx</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Completed cashier checkouts</p>
              </div>
            </div>

            {/* Card 3: Products Sold */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <ShoppingBag size={22} />
                </div>
                {summary?.growth.products_sold_pct !== undefined && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    summary.growth.products_sold_pct >= 0 ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30" : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}>
                    {summary.growth.products_sold_pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(summary.growth.products_sold_pct)}%
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Products Sold</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 font-mono tracking-tight">
                  {(summary?.current.products_sold || 0).toLocaleString()} <span className="text-xs text-muted-foreground font-sans font-semibold">Items</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Total item quantity dispensed</p>
              </div>
            </div>

            {/* Card 4: Customers Served */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Users size={22} />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {summary?.current.registered_customers_served || 0} Registered
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customers Served</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 font-mono tracking-tight">
                  {(summary?.current.customers_served || 0).toLocaleString()} <span className="text-xs text-muted-foreground font-sans font-semibold">Customers</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Unique shoppers in period</p>
              </div>
            </div>
          </div>

          {/* ─── 4. SALES OVERVIEW (LARGE INTERACTIVE CHART) ──────────────────── */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart2 size={20} className="text-emerald-500" />
                  <h2 className="text-lg font-extrabold text-foreground">In-Store Sales Overview</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actual completed physical POS transactions over time
                </p>
              </div>

              {/* Granularity switch */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border self-start sm:self-auto">
                {(["daily", "weekly", "monthly", "yearly"] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setOverviewGroupBy(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      overviewGroupBy === g
                        ? "bg-card text-foreground shadow-sm border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Canvas */}
            <div className={`w-full h-80 pt-2 relative transition-opacity duration-200 ${loadingOverview ? "opacity-40" : "opacity-100"}`}>
              {loadingOverview && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 shadow-md border border-gray-200 rounded-xl text-xs font-bold text-gray-700">
                    <RefreshCw size={13} className="animate-spin text-emerald-600" />
                    Updating chart...
                  </div>
                </div>
              )}
              {salesOverview.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                  <Receipt size={32} className="mb-2 text-gray-300" />
                  <p>
                    No transaction data available for{" "}
                    {preset === "custom_month"
                      ? `${MONTH_OPTIONS[selectedMonth]?.label} ${selectedYear}`
                      : "the selected period"}
                    .
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesOverview} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `₱${formatCompactNumber(v)}`}
                    />
                    <Tooltip content={<CustomOverviewTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total_sales"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ─── 5 & 11. SALES BY CATEGORY & PAYMENT METHODS ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 5. Sales by Category (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <PieChartIcon size={20} className="text-emerald-600" />
                    <h2 className="text-lg font-extrabold text-foreground">Sales by Category</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue distribution across product lines</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono">
                  {peso(categorySales?.total_revenue || 0)} Total
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Donut Chart */}
                <div className="h-64 w-full flex items-center justify-center">
                  {!categorySales?.categories.length ? (
                    <p className="text-xs text-muted-foreground">No category sales in period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySales.categories}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {categorySales.categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Table Breakdown */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-border">
                  {!categorySales?.categories.length ? (
                    <p className="text-xs text-muted-foreground">No categories found.</p>
                  ) : (
                    categorySales.categories.map((c, i) => (
                      <div key={c.category} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-md shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                          />
                          <span className="font-bold text-foreground truncate">{c.category}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-foreground font-mono">{peso(c.revenue)}</p>
                          <p className="text-[10px] text-muted-foreground">{c.items_sold} items • {c.percentage}%</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 11. In-Store Payment (Cash Only) (1 col) */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-emerald-500" />
                  <h2 className="text-lg font-extrabold text-foreground">In-Store Payment</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Physical walk-in POS transactions (Cash Only)</p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-extrabold text-xs text-emerald-900">Cash Tendered</span>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-emerald-700">
                      {peso(paymentMethods?.overall_total || summary?.current.total_sales || 0)}
                    </span>
                  </div>

                  <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 w-full" />
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-emerald-800">
                    <span>{summary?.current.total_transactions || 0} POS Transactions</span>
                    <span className="font-extrabold">100% In-Store Cash</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1">
                  <p className="font-bold text-foreground">Store Payment Policy</p>
                  <p>All in-store walk-in POS purchases are settled strictly via cash tender.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 6. BEST-SELLING PRODUCTS ────────────────────────────────────── */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-emerald-500" />
                  <h2 className="text-lg font-extrabold text-foreground">Best-Selling Products</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Top-performing products ranked by sales</p>
              </div>

              {/* Sort buttons */}
              <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl text-xs font-bold border border-border">
                <span className="text-muted-foreground px-2">Sort by:</span>
                <button
                  onClick={() => setBestSellerSort("revenue")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    bestSellerSort === "revenue" ? "bg-card text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setBestSellerSort("quantity")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    bestSellerSort === "quantity" ? "bg-card text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quantity Sold
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-extrabold uppercase tracking-wider text-left">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Quantity Sold</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedBestSellers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No product sales recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    sortedBestSellers.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted-foreground font-bold w-4">#{idx + 1}</span>
                            <div className="w-9 h-9 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img
                                  src={resolveBackendUrl(p.image_url) ?? undefined}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.target as any).style.display = "none"; }}
                                />
                              ) : (
                                <Package size={16} className="text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-extrabold text-foreground">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-semibold">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-muted-foreground">
                          {peso(p.price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-foreground">
                          {p.quantity_sold.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-500">
                          {peso(p.total_revenue)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${
                            p.stock <= 0
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : p.stock <= p.low_stock_threshold
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}>
                            {p.stock} in stock
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 8 & 9. CUSTOMER PURCHASE ACTIVITY & TOP CUSTOMERS ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Customer Activity Metrics (1 col) */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck size={20} className="text-emerald-500" />
                  <h2 className="text-lg font-extrabold text-foreground">Customer Purchase Activity</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Decoupled from browsing: counts completed POS purchases only
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Total Registered Customers</p>
                    <p className="text-lg font-extrabold text-foreground mt-0.5 font-mono">
                      {customerActivity?.summary.total_registered || 0}
                    </p>
                  </div>
                  <Users size={20} className="text-muted-foreground" />
                </div>

                <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-emerald-500">Customers Who Purchased</p>
                    <p className="text-lg font-extrabold text-foreground mt-0.5 font-mono">
                      {customerActivity?.summary.purchased_in_period || 0}
                    </p>
                  </div>
                  <ShoppingBag size={20} className="text-emerald-500" />
                </div>

                <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-blue-500">Returning Customers</p>
                    <p className="text-lg font-extrabold text-foreground mt-0.5 font-mono">
                      {customerActivity?.summary.returning_customers || 0}
                    </p>
                  </div>
                  <CheckCircle2 size={20} className="text-blue-500" />
                </div>

                <div className="p-3.5 bg-purple-500/10 rounded-xl border border-purple-500/20 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-purple-500">New Customers</p>
                    <p className="text-lg font-extrabold text-foreground mt-0.5 font-mono">
                      {customerActivity?.summary.new_customers || 0}
                    </p>
                  </div>
                  <Sparkles size={20} className="text-purple-500" />
                </div>
              </div>
            </div>

            {/* Top Customers (2 cols) */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-emerald-500" />
                    <h2 className="text-lg font-extrabold text-foreground">Top Customers</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Ranked by actual in-store POS transaction spend</p>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
                  {customerActivity?.top_customers.length || 0} Customers
                </span>
              </div>

              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 border-b border-border">
                    <tr className="text-muted-foreground font-extrabold uppercase tracking-wider text-left">
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-center">Transactions</th>
                      <th className="py-2.5 px-3 text-center">Items Bought</th>
                      <th className="py-2.5 px-3 text-right">Total Spent</th>
                      <th className="py-2.5 px-3 text-right">Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {!customerActivity?.top_customers.length ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No customer purchase activity recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      customerActivity.top_customers.map(c => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-extrabold text-foreground">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{c.customer_code}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-foreground">
                            {c.transactions_count}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                            {c.items_purchased}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-500">
                            {peso(c.total_spent)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">
                            {c.last_purchase_date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ─── 10. STAFF POS PERFORMANCE ───────────────────────────────────── */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-500" />
                <h2 className="text-lg font-extrabold text-foreground">Staff POS Performance</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                POS throughput and register activity processed by staff cashiers
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-extrabold uppercase tracking-wider text-left">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Transactions Processed</th>
                    <th className="py-3 px-4 text-right">Sales Processed</th>
                    <th className="py-3 px-4 text-right">Avg Transaction</th>
                    <th className="py-3 px-4 text-right">Last Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {staffPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No staff activity found.
                      </td>
                    </tr>
                  ) : (
                    staffPerformance.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-foreground">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{s.staff_code} • {s.role}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            s.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-extrabold text-foreground">
                          {s.transactions_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-500">
                          {peso(s.total_sales)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-muted-foreground">
                          {peso(s.avg_transaction_value)}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {s.last_transaction}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 11. RETURNS & REFUNDS ANALYTICS ──────────────────────────── */}
          {returnsData && (
            <div className="space-y-4">
              {/* Returns Section Header */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                  <RotateCcw size={20} className="text-orange-500" />
                  <h2 className="text-lg font-extrabold text-foreground">Returns & Refunds Analytics</h2>
                  {returnsData.summary.pending_count > 0 && (
                    <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-extrabold border border-amber-500/20 animate-pulse">
                      {returnsData.summary.pending_count} Pending
                    </span>
                  )}
                </div>

                {/* Returns Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-orange-500/10 rounded-xl border border-orange-500/20 p-3.5 text-center">
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Total Returns</p>
                    <p className="text-xl font-extrabold text-orange-500 mt-1 font-mono">{returnsData.summary.total_returns}</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-3.5 text-center">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending</p>
                    <p className="text-xl font-extrabold text-amber-500 mt-1 font-mono">{returnsData.summary.pending_count}</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-3.5 text-center">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Approved</p>
                    <p className="text-xl font-extrabold text-emerald-500 mt-1 font-mono">{returnsData.summary.approved_count}</p>
                  </div>
                  <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-3.5 text-center">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Rejected</p>
                    <p className="text-xl font-extrabold text-red-500 mt-1 font-mono">{returnsData.summary.rejected_count}</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-3.5 text-center">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Total Refunded</p>
                    <p className="text-lg font-extrabold text-blue-500 mt-1 font-mono">{peso(returnsData.summary.total_refunded)}</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-xl border border-purple-500/20 p-3.5 text-center">
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Items Returned</p>
                    <p className="text-xl font-extrabold text-purple-500 mt-1 font-mono">{returnsData.summary.items_returned_count}</p>
                  </div>
                </div>

                {/* Return Reasons & Top Returned Products - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Return Reasons Breakdown */}
                  {returnsData.reasons.length > 0 && (
                    <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
                      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                        <PieChartIcon size={14} className="text-orange-500" />
                        Return Reasons Breakdown
                      </h3>
                      <div className="space-y-2">
                        {returnsData.reasons.map((r, i) => {
                          const totalReasons = returnsData.reasons.reduce((s, x) => s + x.count, 0);
                          const pct = totalReasons > 0 ? ((r.count / totalReasons) * 100).toFixed(1) : "0";
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-foreground truncate pr-2">{r.reason}</span>
                                <span className="font-mono font-extrabold text-foreground shrink-0">
                                  {r.count} <span className="text-muted-foreground font-sans">({pct}%)</span>
                                </span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{r.items_count} items</span>
                                <span>Refunded: {peso(r.refund_amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Top Returned Products */}
                  {returnsData.top_returned_products.length > 0 && (
                    <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
                      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                        <Package size={14} className="text-red-500" />
                        Top Returned Products
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground font-extrabold uppercase tracking-wider text-left">
                              <th className="py-2 px-2">Product</th>
                              <th className="py-2 px-2 text-center">Returns</th>
                              <th className="py-2 px-2 text-center">Qty</th>
                              <th className="py-2 px-2 text-center">Restocked</th>
                              <th className="py-2 px-2 text-right">Refund</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {returnsData.top_returned_products.map((p, i) => (
                              <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2 px-2">
                                  <p className="font-bold text-foreground">{p.product_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{p.category}</p>
                                </td>
                                <td className="py-2 px-2 text-center font-mono font-bold text-muted-foreground">{p.return_occurrences}</td>
                                <td className="py-2 px-2 text-center font-mono font-bold text-red-500">{p.total_quantity_returned}</td>
                                <td className="py-2 px-2 text-center font-mono font-bold text-emerald-500">{p.total_restocked_quantity}</td>
                                <td className="py-2 px-2 text-right font-mono font-extrabold text-foreground">{peso(p.total_refund_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Returns List Table */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <RotateCcw size={18} className="text-orange-500" />
                      <h3 className="text-base font-extrabold text-foreground">Return Requests Log</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      All product return requests for the selected period ({filteredReturns.length} records)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={returnSearch}
                        onChange={e => setReturnSearch(e.target.value)}
                        placeholder="Search returns..."
                        className="w-48 pl-8 pr-3 py-1.5 bg-muted/60 border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </div>
                    {/* Status Filter */}
                    <div className="flex items-center gap-1">
                      {["All", "Pending", "Approved", "Completed", "Rejected", "Cancelled"].map(s => (
                        <button
                          key={s}
                          onClick={() => setReturnStatusFilter(s)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors border ${
                            returnStatusFilter === s
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-extrabold uppercase tracking-wider text-left">
                        <th className="py-3 px-3">Return No.</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Receipt</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Reason</th>
                        <th className="py-3 px-3 text-center">Items</th>
                        <th className="py-3 px-3 text-right">Refund</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredReturns.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-muted-foreground">
                            No return requests found for the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredReturns.map(r => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-extrabold text-orange-500">
                              {r.return_no}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                              {r.date}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-blue-500 text-[11px]">
                              {r.receipt_no}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-foreground">{r.customer_name}</p>
                              <p className="text-[10px] text-muted-foreground">{r.customer_code}</p>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground max-w-[140px] truncate" title={r.reason}>
                              {r.reason}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                              {r.total_items_quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-500">
                              {peso(r.refund_amount)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${getReturnStatusStyle(r.status)}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedReturnDetail(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg transition-colors"
                              >
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── 12. RECEIPT / TRANSACTION HISTORY ──────────────────────────── */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt size={20} className="text-emerald-500" />
                  <h2 className="text-lg font-extrabold text-foreground">Transaction History</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actual completed in-store POS receipts for the period
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={e => setTxSearch(e.target.value)}
                    placeholder="Search receipt, customer, staff..."
                    className="w-full pl-8 pr-3 py-1.5 bg-muted/60 border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Cash Tendered (Walk-in)
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-extrabold uppercase tracking-wider text-left">
                    <th className="py-3 px-4">Receipt No.</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        No transactions found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-extrabold text-blue-500">
                          {t.receipt_no}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {t.date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {t.customer}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {t.cashier}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                          {t.items_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-500">
                          {peso(t.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Cash
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReceipt(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
                          >
                            <Eye size={12} /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── RETURN DETAIL MODAL ──────────────────────────────────────────── */}
      {selectedReturnDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-sm">Return Request Detail</h3>
                  <p className="text-[10px] text-muted-foreground">{selectedReturnDetail.return_no}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturnDetail(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <span className={`px-4 py-1.5 rounded-full font-extrabold text-xs border ${getReturnStatusStyle(selectedReturnDetail.status)}`}>
                {selectedReturnDetail.status}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Receipt No.</p>
                <p className="font-extrabold text-blue-500 font-mono mt-0.5">{selectedReturnDetail.receipt_no}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Date Requested</p>
                <p className="font-extrabold text-foreground mt-0.5">{selectedReturnDetail.date}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Customer</p>
                <p className="font-extrabold text-foreground mt-0.5">{selectedReturnDetail.customer_name}</p>
                <p className="text-[10px] text-muted-foreground">{selectedReturnDetail.customer_code}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Reason</p>
                <p className="font-extrabold text-foreground mt-0.5">{selectedReturnDetail.reason}</p>
              </div>
            </div>

            {/* Returned Items Summary */}
            <div className="bg-orange-500/10 rounded-xl border border-orange-500/20 p-4 space-y-2">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Returned Items</p>
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {selectedReturnDetail.returned_items_summary}
              </p>
              <div className="flex items-center gap-4 pt-1 border-t border-orange-500/20 mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {selectedReturnDetail.items_count} product{selectedReturnDetail.items_count !== 1 ? 's' : ''} · {selectedReturnDetail.total_items_quantity} total qty
                </span>
              </div>
            </div>

            {/* Customer Notes */}
            {selectedReturnDetail.customer_notes && (
              <div className="bg-muted/40 rounded-xl border border-border p-3 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Customer Notes</p>
                <p className="text-xs text-foreground">{selectedReturnDetail.customer_notes}</p>
              </div>
            )}

            {/* Admin Notes */}
            {selectedReturnDetail.admin_notes && (
              <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-3 space-y-1">
                <p className="text-[10px] font-bold text-blue-400 uppercase">Store Response / Admin Notes</p>
                <p className="text-xs text-blue-400 font-semibold">{selectedReturnDetail.admin_notes}</p>
              </div>
            )}

            {/* Refund Total */}
            <div className="border-t border-dashed border-border pt-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-muted-foreground">Total Refund Amount</span>
                <span className="font-extrabold text-xl text-emerald-500 font-mono">{peso(selectedReturnDetail.refund_amount)}</span>
              </div>
            </div>

            {/* Close */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => setSelectedReturnDetail(null)}
                className="w-full py-2.5 bg-muted text-foreground font-bold text-xs rounded-xl hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 13. RECEIPT DETAILS MODAL ─────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                  <img src={logoImg} alt="SmartMart" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-sm">SmartMart POS Receipt</h3>
                  <p className="text-[10px] text-muted-foreground">Official Store Transaction</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedReceipt(null); setReceiptItems([]); }}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="space-y-4 text-xs font-mono">
              <div className="text-center pb-2 border-b border-dashed border-border">
                <p className="font-extrabold text-base text-foreground">{selectedReceipt.receipt_no}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">{selectedReceipt.date}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-muted/40 rounded-xl border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Customer</span>
                  <span className="font-extrabold text-foreground">{selectedReceipt.customer}</span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-xl border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Cashier / Staff</span>
                  <span className="font-extrabold text-foreground">{selectedReceipt.cashier}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Purchased Items</p>
                {loadingReceiptItems ? (
                  <p className="text-muted-foreground text-center py-3">Loading receipt items...</p>
                ) : receiptItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">No line items found.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {receiptItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-border/50 text-[11px]">
                        <div>
                          <p className="font-bold text-foreground font-sans">{item.product_name}</p>
                          <p className="text-muted-foreground">{item.quantity} × {peso(item.unit_price)}</p>
                        </div>
                        <span className="font-extrabold text-foreground">{peso(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-border pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{peso(selectedReceipt.total_amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>₱0.00</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="text-emerald-500">{peso(selectedReceipt.total_amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash Tendered</span>
                  <span>{peso(selectedReceipt.cash_tendered)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-foreground">
                  <span>Change</span>
                  <span>{peso(selectedReceipt.change_amount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Payment Method:</span>
                  <span className="font-bold text-foreground">{selectedReceipt.payment_method}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button
                onClick={handleDownloadReceipt}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted text-foreground font-bold text-xs rounded-xl hover:bg-muted/80 transition-colors"
              >
                <Download size={14} /> Download Receipt
              </button>
              <button
                onClick={handlePrintReceipt}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
