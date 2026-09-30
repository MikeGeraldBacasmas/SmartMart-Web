import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, ShoppingBag, Receipt, Calendar, CalendarRange, Search, Filter,
  RefreshCw, Package, ArrowUpRight, BarChart3, PieChart as PieChartIcon,
  ChevronRight, Award, Sparkles, X, ChevronDown, ChevronUp, Store, ArrowLeft,
  CheckCircle, Clock, Tag, RotateCcw, Undo2
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import {
  api,
  CustomerPurchasedItem,
  CustomerReturnItem,
  CustomerReturnRecord,
  CustomerAnalyticsResponse,
  TransactionItem
} from "../../../api";

const peso = (n: number | string) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CHART_COLORS = [
  "#22c55e", "#8b5cf6", "#3b82f6", "#f59e0b",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1"
];

const CAT_COLORS: Record<string, string> = {
  "Snacks": "bg-amber-100 text-amber-800 border-amber-200",
  "Non-Alcoholic Beverages": "bg-blue-100 text-blue-800 border-blue-200",
  "Dairy Products": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Canned Goods": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Condiments & Sauces": "bg-orange-100 text-orange-800 border-orange-200",
  "Instant Noodles": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Bakery & Bread": "bg-rose-100 text-rose-800 border-rose-200",
  "Personal Care": "bg-purple-100 text-purple-800 border-purple-200",
  "Household Essentials": "bg-teal-100 text-teal-800 border-teal-200",
  "Alcoholic Beverages": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const ALL_MONTHS = [
  { num: "01", name: "January", short: "Jan" },
  { num: "02", name: "February", short: "Feb" },
  { num: "03", name: "March", short: "Mar" },
  { num: "04", name: "April", short: "Apr" },
  { num: "05", name: "May", short: "May" },
  { num: "06", name: "June", short: "Jun" },
  { num: "07", name: "July", short: "Jul" },
  { num: "08", name: "August", short: "Aug" },
  { num: "09", name: "September", short: "Sep" },
  { num: "10", name: "October", short: "Oct" },
  { num: "11", name: "November", short: "Nov" },
  { num: "12", name: "December", short: "Dec" },
];

const extractDateYmd = (dateYmd?: string, rawDate?: string) => {
  if (dateYmd && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return dateYmd;
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) return rawDate.slice(0, 10);
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  return "";
};

interface CustomerAnalyticsProps {
  onNavigate?: (page: string) => void;
}

export default function CustomerAnalytics({ onNavigate }: CustomerAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CustomerPurchasedItem[]>([]);
  const [transactions, setTransactions] = useState<CustomerAnalyticsResponse["transactions"]>([]);
  const [periodMode, setPeriodMode] = useState<"monthly" | "yearly" | "custom">("monthly");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  });
  const [customTo, setCustomTo] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spent" | "qty" | "name">("spent");
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalSortBy, setModalSortBy] = useState<"spent" | "qty" | "name">("spent");

  // Return items & return transactions state
  const [returnItems, setReturnItems] = useState<CustomerReturnItem[]>([]);
  const [returns, setReturns] = useState<CustomerReturnRecord[]>([]);

  // Returns Overlay Modal state
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [returnsModalSearch, setReturnsModalSearch] = useState("");
  const [returnsModalStatus, setReturnsModalStatus] = useState("all");

  // Items Overlay Modal state
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [itemsModalSearch, setItemsModalSearch] = useState("");
  const [itemsModalCategory, setItemsModalCategory] = useState("all");

  // Receipt Modal
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [txItems, setTxItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Real-time tracking state
  const isInitialLoad = React.useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch Analytics
  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      if (isInitialLoad.current) setLoading(true);
      else setRefreshing(true);
    }
    try {
      const res = await api.transactions.getMyAnalytics();
      setItems(res.items || []);
      setTransactions(res.transactions || []);
      setReturnItems(res.return_items || []);
      setReturns(res.returns || []);
      setLastUpdated(new Date());

      // If we have data, set default selections on initial load
      if (isInitialLoad.current && res.transactions?.length > 0) {
        const latestTx = res.transactions[0];
        if (latestTx.year) {
          setSelectedYear(latestTx.year);
        }
        if (latestTx.year_month) {
          setSelectedMonth(latestTx.year_month);
          const [y, m] = latestTx.year_month.split("-");
          if (y && m) {
            const lastDay = new Date(Number(y), Number(m), 0).getDate();
            setCustomFrom(`${y}-${m}-01`);
            setCustomTo(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
          }
        }
        isInitialLoad.current = false;
      }
    } catch (e) {
      console.warn("Could not fetch analytics, falling back to history with item hydration:", e);
      // Fallback: fetch my-history and attempt item hydration
      try {
        const history = await api.transactions.getMyHistory();
        const fallbackTx = (history || []).map(t => {
          const d = new Date(t.date || Date.now());
          const y = isNaN(d.getFullYear()) ? new Date().getFullYear().toString() : d.getFullYear().toString();
          const ym = isNaN(d.getMonth()) ? `${y}-01` : `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return {
            id: t.id,
            receipt_no: t.receipt_no,
            total_amount: Number(t.total_amount || 0),
            date_ymd: ym + "-01",
            year_month: ym,
            year: y,
            month_label: isNaN(d.getMonth()) ? "Jan " + y : d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            date: t.date || ""
          };
        });
        setTransactions(fallbackTx);
        if (isInitialLoad.current && fallbackTx.length > 0) {
          setSelectedYear(fallbackTx[0].year);
          setSelectedMonth(fallbackTx[0].year_month);
          isInitialLoad.current = false;
        }

        // Hydrate items in fallback
        if (fallbackTx.length > 0) {
          const itemPromises = fallbackTx.slice(0, 15).map(async (t) => {
            try {
              const rawItems: any = await api.transactions.getItems(t.id);
              return (rawItems || []).map((ri: any) => ({
                item_id: ri.id,
                transaction_id: t.id,
                receipt_no: t.receipt_no,
                created_at: t.date,
                date_ymd: t.date_ymd,
                year_month: t.year_month,
                year: t.year,
                month_label: t.month_label,
                formatted_date: t.date,
                product_id: ri.product_id,
                product_name: ri.product_name || ri.name,
                category_id: 0,
                category: "General",
                quantity: Number(ri.quantity || 1),
                unit_price: Number(ri.unit_price || ri.price || 0),
                line_total: Number(ri.subtotal || (Number(ri.quantity || 1) * Number(ri.unit_price || ri.price || 0))),
              }));
            } catch {
              return [];
            }
          });
          const nestedItems = await Promise.all(itemPromises);
          const flatItems = nestedItems.flat();
          if (flatItems.length > 0) {
            setItems(flatItems);
          }
        }
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Fallback error:", err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time synchronization
  useEffect(() => {
    loadData();

    // Auto-poll in real time every 6 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 6000);

    // Refresh immediately when tab gains focus or visibility returns
    const handleFocus = () => loadData(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadData]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => { if (t.year) years.add(t.year); });
    items.forEach(i => { if (i.year) years.add(i.year); });
    const list = Array.from(years).sort((a, b) => b.localeCompare(a));
    return list;
  }, [transactions, items]);

  // Complete list of all 12 months from January to December
  const allMonthsList = useMemo(() => {
    const yr = selectedYear !== "all" ? selectedYear : (availableYears[0] || new Date().getFullYear().toString());

    return ALL_MONTHS.map(m => {
      const ym = selectedYear !== "all" ? `${yr}-${m.num}` : `month-${m.num}`;
      const label = selectedYear !== "all" ? `${m.name} ${yr}` : m.name;
      return {
        ym,
        label,
        monthNum: m.num,
        monthName: m.name,
        year: yr,
      };
    });
  }, [selectedYear, availableYears]);

  // Available Categories
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(i => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats).sort();
  }, [items]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      // Period filter
      if (periodMode === "custom") {
        const itemDate = extractDateYmd(i.date_ymd, i.created_at || i.formatted_date);
        if (customFrom && itemDate && itemDate < customFrom) return false;
        if (customTo && itemDate && itemDate > customTo) return false;
      } else if (periodMode === "monthly") {
        if (selectedMonth !== "all") {
          if (selectedMonth.startsWith("month-")) {
            const mNum = selectedMonth.replace("month-", "");
            const itemM = i.month_num ? String(i.month_num).padStart(2, "0") : (i.year_month?.split("-")[1] || "");
            if (itemM !== mNum) return false;
          } else {
            if (i.year_month !== selectedMonth) return false;
          }
        }
        if (selectedYear !== "all" && i.year !== selectedYear) return false;
      } else {
        if (selectedYear !== "all" && i.year !== selectedYear) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && i.category !== selectedCategory) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const mProd = (i.product_name || "").toLowerCase().includes(q);
        const mCat = (i.category || "").toLowerCase().includes(q);
        const mRec = (i.receipt_no || "").toLowerCase().includes(q);
        if (!mProd && !mCat && !mRec) return false;
      }

      return true;
    });
  }, [items, periodMode, customFrom, customTo, selectedMonth, selectedYear, selectedCategory, search]);

  // Filter Transactions in active period
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (periodMode === "custom") {
        const txDate = extractDateYmd(t.date_ymd, t.date || (t as any).created_at);
        if (customFrom && txDate && txDate < customFrom) return false;
        if (customTo && txDate && txDate > customTo) return false;
      } else if (periodMode === "monthly") {
        if (selectedMonth !== "all") {
          if (selectedMonth.startsWith("month-")) {
            const mNum = selectedMonth.replace("month-", "");
            const txM = t.year_month ? t.year_month.split("-")[1] : "";
            if (txM !== mNum) return false;
          } else {
            if (t.year_month !== selectedMonth) return false;
          }
        }
        if (selectedYear !== "all" && t.year !== selectedYear) return false;
      } else {
        if (selectedYear !== "all" && t.year !== selectedYear) return false;
      }
      return true;
    });
  }, [transactions, periodMode, customFrom, customTo, selectedMonth, selectedYear]);

  // Filter Returns in active period
  const filteredReturnItems = useMemo(() => {
    return returnItems.filter(ri => {
      if (periodMode === "custom") {
        const rDate = extractDateYmd(ri.date_ymd, ri.created_at || ri.formatted_date);
        if (customFrom && rDate && rDate < customFrom) return false;
        if (customTo && rDate && rDate > customTo) return false;
      } else if (periodMode === "monthly") {
        if (selectedMonth !== "all") {
          if (selectedMonth.startsWith("month-")) {
            const mNum = selectedMonth.replace("month-", "");
            const rM = ri.month_num ? String(ri.month_num).padStart(2, "0") : (ri.year_month?.split("-")[1] || "");
            if (rM !== mNum) return false;
          } else {
            if (ri.year_month !== selectedMonth) return false;
          }
        }
        if (selectedYear !== "all" && ri.year !== selectedYear) return false;
      } else {
        if (selectedYear !== "all" && ri.year !== selectedYear) return false;
      }

      if (selectedCategory !== "all" && ri.category !== selectedCategory) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const mProd = (ri.product_name || "").toLowerCase().includes(q);
        const mRet = (ri.return_no || "").toLowerCase().includes(q);
        const mRec = (ri.receipt_no || "").toLowerCase().includes(q);
        const mReason = (ri.reason || "").toLowerCase().includes(q);
        if (!mProd && !mRet && !mRec && !mReason) return false;
      }

      return true;
    });
  }, [returnItems, periodMode, customFrom, customTo, selectedMonth, selectedYear, selectedCategory, search]);

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      if (periodMode === "custom") {
        const rDate = extractDateYmd(r.date_ymd, r.created_at);
        if (customFrom && rDate && rDate < customFrom) return false;
        if (customTo && rDate && rDate > customTo) return false;
      } else if (periodMode === "monthly") {
        if (selectedMonth !== "all") {
          if (selectedMonth.startsWith("month-")) {
            const mNum = selectedMonth.replace("month-", "");
            const rM = r.year_month?.split("-")[1] || "";
            if (rM !== mNum) return false;
          } else {
            if (r.year_month !== selectedMonth) return false;
          }
        }
        if (selectedYear !== "all" && r.year !== selectedYear) return false;
      } else {
        if (selectedYear !== "all" && r.year !== selectedYear) return false;
      }
      return true;
    });
  }, [returns, periodMode, customFrom, customTo, selectedMonth, selectedYear]);

  // Aggregate Metrics
  const totalSpent = useMemo(() => {
    if (filteredItems.length > 0) {
      return filteredItems.reduce((sum, i) => sum + Number(i.line_total || 0), 0);
    }
    return filteredTransactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  }, [filteredItems, filteredTransactions]);

  const totalUnits = useMemo(() => {
    return filteredItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  }, [filteredItems]);

  const totalOrders = useMemo(() => {
    const txSet = new Set(filteredItems.map(i => i.transaction_id || i.receipt_no));
    return txSet.size > 0 ? txSet.size : filteredTransactions.length;
  }, [filteredItems, filteredTransactions]);

  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Aggregate Return Metrics
  const totalRefunded = useMemo(() => {
    return filteredReturnItems.reduce((sum, ri) => {
      if (ri.status === "Completed" || ri.status === "Approved") {
        return sum + Number(ri.refund_amount || 0);
      }
      return sum;
    }, 0);
  }, [filteredReturnItems]);

  const totalUnitsReturned = useMemo(() => {
    return filteredReturnItems.reduce((sum, ri) => {
      if (ri.status === "Completed" || ri.status === "Approved") {
        return sum + Number(ri.quantity || 0);
      }
      return sum;
    }, 0);
  }, [filteredReturnItems]);

  const netSpent = Math.max(0, totalSpent - totalRefunded);

  // Product Aggregates: What they bought
  const productAggregates = useMemo(() => {
    const map: Record<string, {
      product_name: string;
      category: string;
      quantity: number;
      total_spent: number;
      unit_price: number;
      purchases_count: number;
      returned_quantity: number;
      refund_amount: number;
      last_purchased: string;
    }> = {};

    filteredItems.forEach(i => {
      const key = i.product_name || `prod-${i.product_id}`;
      if (!map[key]) {
        map[key] = {
          product_name: i.product_name,
          category: i.category || "General",
          quantity: 0,
          total_spent: 0,
          unit_price: Number(i.unit_price || 0),
          purchases_count: 0,
          returned_quantity: 0,
          refund_amount: 0,
          last_purchased: i.formatted_date || i.date_ymd || "",
        };
      }
      map[key].quantity += Number(i.quantity || 0);
      map[key].total_spent += Number(i.line_total || 0);
      map[key].purchases_count += 1;
      map[key].returned_quantity += Number(i.returned_quantity || 0);
      map[key].refund_amount += Number(i.item_refund_amount || 0);
      map[key].unit_price = Number(i.unit_price || map[key].unit_price);
    });

    const arr = Object.values(map);
    if (sortBy === "spent") {
      arr.sort((a, b) => b.total_spent - a.total_spent);
    } else if (sortBy === "qty") {
      arr.sort((a, b) => b.quantity - a.quantity);
    } else {
      arr.sort((a, b) => a.product_name.localeCompare(b.product_name));
    }
    return arr;
  }, [filteredItems, sortBy]);

  const topProduct = productAggregates.length > 0 ? productAggregates[0] : null;

  // Filtered & sorted products for the View All Overlay modal
  const modalProducts = useMemo(() => {
    let list = [...productAggregates];
    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      list = list.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (modalSortBy === "spent") {
      list.sort((a, b) => b.total_spent - a.total_spent);
    } else if (modalSortBy === "qty") {
      list.sort((a, b) => b.quantity - a.quantity);
    } else {
      list.sort((a, b) => a.product_name.localeCompare(b.product_name));
    }
    return list;
  }, [productAggregates, modalSearch, modalSortBy]);

  // Filtered items for the Itemized Purchases Overlay modal
  const modalFilteredItems = useMemo(() => {
    return filteredItems.filter(i => {
      if (itemsModalCategory !== "all" && i.category !== itemsModalCategory) return false;
      if (itemsModalSearch.trim()) {
        const q = itemsModalSearch.toLowerCase();
        const mProd = (i.product_name || "").toLowerCase().includes(q);
        const mRec = (i.receipt_no || "").toLowerCase().includes(q);
        const mCat = (i.category || "").toLowerCase().includes(q);
        const mDate = (i.formatted_date || i.date_ymd || "").toLowerCase().includes(q);
        if (!mProd && !mRec && !mCat && !mDate) return false;
      }
      return true;
    });
  }, [filteredItems, itemsModalCategory, itemsModalSearch]);

  // Filtered returns for the Returns Overlay modal
  const modalFilteredReturnItems = useMemo(() => {
    return filteredReturnItems.filter(ri => {
      if (returnsModalStatus !== "all" && ri.status !== returnsModalStatus) return false;
      if (returnsModalSearch.trim()) {
        const q = returnsModalSearch.toLowerCase();
        const mProd = (ri.product_name || "").toLowerCase().includes(q);
        const mRet = (ri.return_no || "").toLowerCase().includes(q);
        const mRec = (ri.receipt_no || "").toLowerCase().includes(q);
        const mCat = (ri.category || "").toLowerCase().includes(q);
        const mReason = (ri.reason || "").toLowerCase().includes(q);
        const mDate = (ri.formatted_date || ri.date_ymd || "").toLowerCase().includes(q);
        if (!mProd && !mRet && !mRec && !mCat && !mReason && !mDate) return false;
      }
      return true;
    });
  }, [filteredReturnItems, returnsModalStatus, returnsModalSearch]);

  // Category Distribution (for PieChart)
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach(i => {
      const cat = i.category || "General";
      map[cat] = (map[cat] || 0) + Number(i.line_total || 0);
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    })).sort((a, b) => b.value - a.value);
  }, [filteredItems]);

  // Yearly 12-Month Bar Chart
  const yearlyTrendData = useMemo(() => {
    const targetYear = selectedYear !== "all" ? selectedYear : (availableYears[0] || "2026");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return months.map((mShort, idx) => {
      const mNum = String(idx + 1).padStart(2, "0");
      const ym = `${targetYear}-${mNum}`;
      
      const txsInMonth = transactions.filter(t => t.year_month === ym);
      const itemsInMonth = items.filter(i => i.year_month === ym);
      
      const spent = itemsInMonth.length > 0
        ? itemsInMonth.reduce((s, i) => s + Number(i.line_total || 0), 0)
        : txsInMonth.reduce((s, t) => s + Number(t.total_amount || 0), 0);
      const units = itemsInMonth.reduce((s, i) => s + Number(i.quantity || 0), 0);

      return {
        month: mShort,
        ym,
        spent: Math.round(spent * 100) / 100,
        units,
        orders: txsInMonth.length,
      };
    });
  }, [transactions, items, selectedYear, availableYears]);

  // Monthly/Custom breakdown: Weekly/Daily spending distribution
  const monthlyTrendData = useMemo(() => {
    if (periodMode === "yearly") return [];
    
    // Group transactions / items in the period by date
    const map: Record<string, { date: string; spent: number; units: number }> = {};
    filteredItems.forEach(i => {
      const dateKey = i.date_ymd || i.formatted_date?.slice(0, 10) || "Unknown";
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, spent: 0, units: 0 };
      }
      map[dateKey].spent += Number(i.line_total || 0);
      map[dateKey].units += Number(i.quantity || 0);
    });

    if (Object.keys(map).length === 0 && filteredTransactions.length > 0) {
      filteredTransactions.forEach(t => {
        const dateKey = t.date_ymd || (t.date ? t.date.slice(0, 10) : "Unknown");
        if (!map[dateKey]) {
          map[dateKey] = { date: dateKey, spent: 0, units: 0 };
        }
        map[dateKey].spent += Number(t.total_amount || 0);
      });
    }

    const entries = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    return entries.map(e => ({
      date: e.date.length >= 10 ? e.date.slice(5) : e.date,
      fullDate: e.date,
      spent: Math.round(e.spent * 100) / 100,
      units: e.units,
    }));
  }, [filteredItems, filteredTransactions, periodMode]);

  // View Receipt handler
  const handleOpenReceipt = async (receiptNo: string, txId?: number) => {
    setLoadingTx(true);
    try {
      if (txId) {
        const fullTx = await api.transactions.getItems(txId);
        setTxItems((fullTx as any[]).map(i => ({
          name: i.product_name,
          qty: i.quantity,
          price: Number(i.unit_price)
        })));
        const target = transactions.find(t => t.id === txId);
        if (target) {
          setSelectedTx({
            id: target.id,
            receipt_no: target.receipt_no,
            customer: "You",
            cashier: "Cashier",
            total_amount: target.total_amount,
            cash_tendered: target.total_amount,
            change_amount: 0,
            date: target.date,
          });
        }
      }
    } catch {
      setTxItems([]);
    } finally {
      setLoadingTx(false);
    }
  };

  // Human-readable active period label
  const activePeriodLabel = useMemo(() => {
    if (periodMode === "custom") {
      if (customFrom && customTo) {
        const fDate = new Date(customFrom + "T00:00:00");
        const tDate = new Date(customTo + "T00:00:00");
        const fStr = isNaN(fDate.getTime()) ? customFrom : fDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const tStr = isNaN(tDate.getTime()) ? customTo : tDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return `${fStr} – ${tStr}`;
      }
      if (customFrom) return `Since ${customFrom}`;
      if (customTo) return `Up to ${customTo}`;
      return "Custom Date Range";
    }
    if (periodMode === "monthly") {
      if (selectedMonth === "all") {
        return selectedYear !== "all" ? `All Months of ${selectedYear}` : "All Recorded Months";
      }
      const found = allMonthsList.find(m => m.ym === selectedMonth);
      if (found) return found.label;
      return selectedMonth;
    } else {
      if (selectedYear === "all") return "All Time (All Years)";
      return `Year ${selectedYear}`;
    }
  }, [periodMode, customFrom, customTo, selectedMonth, selectedYear, allMonthsList]);

  return (
    <div className="p-6 space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-semibold">
            <Sparkles size={14} className="text-yellow-300" /> SmartMart Customer Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            My Shopping & Spending Analytics
          </h1>
          <p className="text-emerald-100 text-sm max-w-xl">
            Track what you bought, your monthly & yearly expenditures, and your most-purchased items in the store.
          </p>
        </div>

        {/* Period Switcher (Monthly vs Yearly vs Custom) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 z-10">
          <div className="bg-black/25 p-1.5 rounded-2xl flex flex-wrap items-center backdrop-blur-md border border-white/15 shadow-inner gap-1">
            <button
              onClick={() => {
                setPeriodMode("monthly");
                if (selectedMonth === "all") {
                  const yr = selectedYear !== "all" ? selectedYear : (availableYears[0] || new Date().getFullYear().toString());
                  const found = transactions.find(t => t.year === yr);
                  setSelectedMonth(found?.year_month || `${yr}-01`);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                periodMode === "monthly"
                  ? "bg-white text-emerald-800 shadow-md scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Calendar size={14} /> Monthly
            </button>
            <button
              onClick={() => {
                setPeriodMode("yearly");
                if (selectedYear === "all" && availableYears.length > 0) {
                  setSelectedYear(availableYears[0]);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                periodMode === "yearly"
                  ? "bg-white text-purple-900 shadow-md scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <BarChart3 size={14} /> Yearly
            </button>
            <button
              onClick={() => {
                setPeriodMode("custom");
                if (!customFrom || !customTo) {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const lastDay = new Date(y, Number(m), 0).getDate();
                  setCustomFrom(`${y}-${m}-01`);
                  setCustomTo(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                periodMode === "custom"
                  ? "bg-white text-emerald-800 shadow-md scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <CalendarRange size={14} /> Custom Date
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Date Inputs (From Date to Date) */}
          {periodMode === "custom" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">From:</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full bg-white dark:bg-card border border-slate-300 dark:border-border text-slate-800 dark:text-slate-100 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">To:</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full bg-white dark:bg-card border border-slate-300 dark:border-border text-slate-800 dark:text-slate-100 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Year Selector (Shown in Monthly & Yearly modes) */}
          {periodMode !== "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Year:</span>
              <select
                value={selectedYear}
                onChange={e => {
                  const yr = e.target.value;
                  setSelectedYear(yr);
                  if (periodMode === "monthly" && selectedMonth !== "all") {
                    const mNum = selectedMonth.includes("-") ? selectedMonth.split("-")[1] : selectedMonth.replace("month-", "");
                    if (yr !== "all") {
                      setSelectedMonth(`${yr}-${mNum}`);
                    } else {
                      setSelectedMonth(`month-${mNum}`);
                    }
                  }
                }}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="all">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Month Selector (Shown in Monthly mode) */}
          {periodMode === "monthly" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Month:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="all">All Months</option>
                {allMonthsList.map(m => (
                  <option key={m.ym} value={m.ym}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-[160px]"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Filter for items */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items bought..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Active Period Pill Notice */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
          <span>Active Period:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Clock size={12} /> {activePeriodLabel}
          </span>
          {selectedCategory !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <Tag size={12} /> {selectedCategory}
            </span>
          )}
        </p>

        {productAggregates.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Tracking <strong className="text-foreground">{productAggregates.length}</strong> unique products
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-card rounded-3xl border border-border">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mb-3" />
          <p className="text-sm font-bold text-foreground">Loading your shopping analytics...</p>
          <p className="text-xs text-muted-foreground mt-1">Analyzing your receipts and purchased items</p>
        </div>
      ) : items.length === 0 && transactions.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <ShoppingBag size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-foreground">No Purchases Recorded Yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Once you complete purchases at the SmartMart POS counter, your personalized monthly and yearly analytics will show up here.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("browse")}
              className="px-5 py-2.5 rounded-xl bg-[#22c55e] text-white text-xs font-bold hover:bg-[#16a34a] transition-all shadow-sm inline-flex items-center gap-2"
            >
              <Store size={15} /> Browse Products
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 5 Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. Total Amount Spent */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Total Spent ({periodMode === "monthly" ? "Month" : periodMode === "yearly" ? "Year" : "Custom Range"})
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                {peso(totalSpent)}
              </p>
              {totalRefunded > 0 ? (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                  <span>Net:</span> <strong className="text-emerald-600 font-extrabold" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(netSpent)}</strong>
                  <span className="text-[11px] text-amber-600 font-semibold">({peso(totalRefunded)} refunded)</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span>In</span> <strong className="text-foreground">{activePeriodLabel}</strong>
                </p>
              )}
            </div>

            {/* 2. Total Items Bought */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Items Purchased
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground mt-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                {totalUnits.toLocaleString()} <span className="text-sm font-semibold text-muted-foreground">units</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalUnitsReturned > 0 ? (
                  <span>
                    <strong className="text-foreground">{totalUnits - totalUnitsReturned}</strong> kept • <strong className="text-amber-600">{totalUnitsReturned}</strong> returned
                  </span>
                ) : (
                  <span>Across <strong className="text-foreground">{productAggregates.length}</strong> unique products</span>
                )}
              </p>
            </div>

            {/* 3. Returns & Refunds */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Returns & Refunds
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <RotateCcw size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                {peso(totalRefunded)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredReturnItems.length > 0 ? (
                  <span><strong className="text-foreground">{totalUnitsReturned}</strong> units • <strong className="text-foreground">{filteredReturnItems.length}</strong> {filteredReturnItems.length === 1 ? "return" : "returns"}</span>
                ) : (
                  <span>0 returns in this period</span>
                )}
              </p>
            </div>

            {/* 4. Orders / Store Visits */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Store Visits
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Store size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground mt-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                {totalOrders} <span className="text-sm font-semibold text-muted-foreground">{totalOrders === 1 ? "receipt" : "receipts"}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: <strong className="text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(avgOrderValue)}</strong> / visit
              </p>
            </div>

            {/* 5. Top Favorite Product */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Top Product
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award size={18} />
                </div>
              </div>
              <p className="text-sm font-black text-foreground mt-2 truncate" title={topProduct?.product_name || "N/A"}>
                {topProduct?.product_name || "None in period"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                <span>{topProduct ? `${topProduct.quantity} units bought` : "No data"}</span>
                {topProduct && (
                  <span className="font-extrabold text-amber-600" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {peso(topProduct.total_spent)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Visual Trend Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Trend Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-card rounded-3xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-600" />
                    {periodMode === "yearly" ? `Monthly Spending Breakdown (${selectedYear !== "all" ? selectedYear : "Current Year"})` : "Daily Spending Activity"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {periodMode === "yearly"
                      ? "Track your month-by-month spending across the 12 months of the year"
                      : `Your purchase days and amounts in ${activePeriodLabel}`}
                  </p>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-64 w-full pt-2">
                {periodMode === "yearly" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/50" />
                      <XAxis dataKey="month" stroke="currentColor" className="text-[11px] text-muted-foreground" tickLine={false} />
                      <YAxis stroke="currentColor" className="text-[11px] text-muted-foreground" tickLine={false} tickFormatter={v => `₱${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val: any) => [peso(val), "Spent"]}
                        labelFormatter={(m: any) => `Month: ${m}`}
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="spent" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="monthSpendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/50" />
                      <XAxis dataKey="date" stroke="currentColor" className="text-[11px] text-muted-foreground" tickLine={false} />
                      <YAxis stroke="currentColor" className="text-[11px] text-muted-foreground" tickLine={false} tickFormatter={v => `₱${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val: any) => [peso(val), "Total Spent"]}
                        labelFormatter={(l: any) => `Date: ${l}`}
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}
                      />
                      <Area type="monotone" dataKey="spent" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#monthSpendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                    No transactions recorded for this specific period.
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown (1 Col) */}
            <div className="bg-card rounded-3xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <PieChartIcon size={18} className="text-purple-600" />
                  Category Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Where your money went by product category</p>
              </div>

              {categoryChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
                  No category data for this period
                </div>
              ) : (
                <>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [peso(val), "Spent"]}
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Legend list */}
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {categoryChartData.map((c, idx) => {
                      const pct = totalSpent > 0 ? ((c.value / totalSpent) * 100).toFixed(0) : "0";
                      return (
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <span className="font-semibold text-foreground truncate">{c.name}</span>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">{pct}%</span>
                            <span className="font-bold text-foreground font-mono">{peso(c.value)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* "What You Bought" - Top Purchased Products Section */}
          <div className="bg-card rounded-3xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-600" />
                  What You Bought ({activePeriodLabel})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Summary of individual products you purchased, ranked by expenditure and quantity
                </p>
              </div>

              {/* View All control */}
              {productAggregates.length > 9 && (
                <button
                  type="button"
                  onClick={() => {
                    setModalSearch("");
                    setShowProductsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm transition-all hover:scale-105 active:scale-95"
                >
                  <ShoppingBag size={14} /> View All ({productAggregates.length})
                </button>
              )}
            </div>

            {productAggregates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No items match your filter for this period.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productAggregates.slice(0, 9).map((p, idx) => {
                    const sharePct = totalSpent > 0 ? (p.total_spent / totalSpent) * 100 : 0;
                    return (
                      <div
                        key={p.product_name}
                        className="bg-muted/20 hover:bg-muted/40 rounded-2xl border border-border/80 p-4 transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[p.category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {p.category}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">
                              {p.purchases_count} {p.purchases_count === 1 ? "order" : "orders"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            <p className="font-extrabold text-foreground text-sm line-clamp-1 flex-1" title={p.product_name}>
                              {p.product_name}
                            </p>
                            {p.returned_quantity > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                <RotateCcw size={10} /> {p.returned_quantity} ret
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Quantity</p>
                              <p className="text-base font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                                {p.quantity} <span className="text-xs font-semibold text-muted-foreground">units</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground">Total Spent</p>
                              <p className="text-base font-extrabold text-emerald-600" style={{ fontFamily: "'DM Mono', monospace" }}>
                                {peso(p.total_spent)}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar of total spending share */}
                          <div>
                            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(4, sharePct))}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                              <span>Avg {peso(p.unit_price)}/unit</span>
                              <span>{sharePct.toFixed(1)}% of period spend</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </>
            )}
          </div>

          {/* Itemized Purchase Table */}
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Receipt size={18} className="text-purple-600" />
                  Itemized Store Purchases ({filteredItems.length} records)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every product item recorded in your store checkout receipts
                </p>
              </div>

              {filteredItems.length > 10 && (
                <button
                  type="button"
                  onClick={() => {
                    setItemsModalSearch("");
                    setItemsModalCategory("all");
                    setShowItemsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                  <Receipt size={14} /> View All ({filteredItems.length})
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-left">
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Line Total</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No purchased items match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.slice(0, 10).map((item, idx) => (
                      <tr key={`${item.transaction_id}-${item.item_id || idx}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {item.receipt_no}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {item.formatted_date || item.date_ymd}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {item.product_name}
                          {item.returned_quantity && item.returned_quantity > 0 ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              <RotateCcw size={10} /> {item.returned_quantity} returned
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[item.category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {peso(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold font-mono text-foreground">
                          ×{item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600">
                          {peso(item.line_total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenReceipt(item.receipt_no, item.transaction_id)}
                            className="text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center gap-1"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Returned Items & Refunds Section */}
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <RotateCcw size={18} className="text-amber-600" />
                  Returned Items & Refunds ({filteredReturnItems.length} {filteredReturnItems.length === 1 ? "record" : "records"})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track individual returned merchandise, return reasons, and refunded amounts in {activePeriodLabel}
                </p>
              </div>

              {/* View All Button */}
              {filteredReturnItems.length > 10 && (
                <button
                  type="button"
                  onClick={() => {
                    setReturnsModalSearch("");
                    setReturnsModalStatus("all");
                    setShowReturnsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                  <RotateCcw size={14} /> View All ({filteredReturnItems.length})
                </button>
              )}
            </div>

            {filteredReturnItems.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs rounded-2xl bg-muted/20 border border-dashed border-border/70 space-y-1">
                <CheckCircle size={26} className="mx-auto text-emerald-500 opacity-80 mb-1" />
                <p className="font-bold text-foreground text-sm">No Returns Recorded</p>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  You have no returned or refunded items in {activePeriodLabel}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-left">
                      <th className="px-4 py-3">Return No</th>
                      <th className="px-4 py-3">Receipt No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-center">Returned Qty</th>
                      <th className="px-4 py-3 text-right">Refund Amount</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReturnItems.slice(0, 10).map((ri, idx) => {
                      const statusColor =
                        ri.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : ri.status === "Approved"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : ri.status === "Pending"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-rose-100 text-rose-800 border-rose-200";

                      return (
                        <tr key={`${ri.return_id}-${ri.return_item_id || idx}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-amber-700">
                            {ri.return_no}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {ri.receipt_no}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {ri.formatted_date || ri.date_ymd}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {ri.product_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[ri.category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                              {ri.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono text-foreground">
                            ×{ri.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600">
                            {peso(ri.refund_amount)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="font-semibold text-foreground">{ri.reason}</span>
                            {ri.customer_notes && (
                              <span className="block text-[11px] text-muted-foreground italic truncate max-w-xs" title={ri.customer_notes}>
                                "{ri.customer_notes}"
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${statusColor}`}>
                              {ri.status === "Completed" && <CheckCircle size={11} />}
                              {ri.status === "Approved" && <CheckCircle size={11} />}
                              {ri.status === "Pending" && <Clock size={11} />}
                              {ri.status === "Rejected" && <X size={11} />}
                              {ri.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Overlay Page: View All Purchased Products Modal */}
      {showProductsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" style={{ animation: "txFadeIn .2s ease" }}>
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProductsModal(false)} />

          {/* Modal Container */}
          <div
            className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            style={{ animation: "txSlideUp .2s ease" }}
          >
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground leading-tight">All Purchased Products</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {productAggregates.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activePeriodLabel} • Complete list of individual products purchased
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowProductsModal(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 self-end sm:self-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Filter Toolbar */}
            <div className="shrink-0 px-6 py-3 bg-muted/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar inside Modal */}
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search products or category..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Sort controls inside Modal */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Sort By:</span>
                <div className="inline-flex rounded-xl bg-card p-1 border border-border text-xs">
                  <button
                    onClick={() => setModalSortBy("spent")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      modalSortBy === "spent" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Highest Spent
                  </button>
                  <button
                    onClick={() => setModalSortBy("qty")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      modalSortBy === "qty" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Most Units
                  </button>
                  <button
                    onClick={() => setModalSortBy("name")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      modalSortBy === "name" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Name
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Products Grid in Modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalProducts.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  No products match "{modalSearch}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modalProducts.map((p, idx) => {
                    const sharePct = totalSpent > 0 ? (p.total_spent / totalSpent) * 100 : 0;
                    return (
                      <div
                        key={p.product_name}
                        className="bg-card hover:bg-muted/30 rounded-2xl border border-border p-4 transition-all space-y-3 flex flex-col justify-between shadow-sm hover:shadow"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[p.category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {p.category}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">
                              {p.purchases_count} {p.purchases_count === 1 ? "order" : "orders"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            <p className="font-extrabold text-foreground text-sm line-clamp-1 flex-1" title={p.product_name}>
                              {p.product_name}
                            </p>
                            {p.returned_quantity > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                <RotateCcw size={10} /> {p.returned_quantity} ret
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Quantity</p>
                              <p className="text-base font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                                {p.quantity} <span className="text-xs font-semibold text-muted-foreground">units</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground">Total Spent</p>
                              <p className="text-base font-extrabold text-emerald-600" style={{ fontFamily: "'DM Mono', monospace" }}>
                                {peso(p.total_spent)}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar of total spending share */}
                          <div>
                            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(4, sharePct))}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                              <span>Avg {peso(p.unit_price)}/unit</span>
                              <span>{sharePct.toFixed(1)}% of period spend</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-6 py-3 border-t border-border bg-card flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{modalProducts.length}</strong> of {productAggregates.length} products
              </span>
              <button
                type="button"
                onClick={() => setShowProductsModal(false)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Page: View All Itemized Purchases Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" style={{ animation: "txFadeIn .2s ease" }}>
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowItemsModal(false)} />

          {/* Modal Container */}
          <div
            className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            style={{ animation: "txSlideUp .2s ease" }}
          >
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground leading-tight">All Itemized Store Purchases</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                      {filteredItems.length} Records
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activePeriodLabel} • Complete record of every line item from your receipts
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowItemsModal(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 self-end sm:self-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Filter Toolbar */}
            <div className="shrink-0 px-6 py-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar inside Modal */}
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={itemsModalSearch}
                  onChange={(e) => setItemsModalSearch(e.target.value)}
                  placeholder="Search receipt, product, date..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                />
                {itemsModalSearch && (
                  <button
                    onClick={() => setItemsModalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category selector inside Modal */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Category:</span>
                <select
                  value={itemsModalCategory}
                  onChange={(e) => setItemsModalCategory(e.target.value)}
                  className="text-xs rounded-xl bg-card border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Table inside Modal */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Line Total</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modalFilteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <Search size={28} className="mx-auto mb-2 opacity-30" />
                        No purchased items match "{itemsModalSearch || itemsModalCategory}".
                      </td>
                    </tr>
                  ) : (
                    modalFilteredItems.map((item, idx) => (
                      <tr key={`modal-item-${item.transaction_id}-${item.item_id || idx}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {item.receipt_no}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {item.formatted_date || item.date_ymd}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {item.product_name}
                          {item.returned_quantity && item.returned_quantity > 0 ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              <RotateCcw size={10} /> {item.returned_quantity} returned
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[item.category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {peso(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold font-mono text-foreground">
                          ×{item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600">
                          {peso(item.line_total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenReceipt(item.receipt_no, item.transaction_id)}
                            className="text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center gap-1"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-6 py-3 border-t border-border bg-card flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{modalFilteredItems.length}</strong> of {filteredItems.length} records
              </span>
              <button
                type="button"
                onClick={() => setShowItemsModal(false)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Page: View All Returned Items Modal */}
      {showReturnsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" style={{ animation: "txFadeIn .2s ease" }}>
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReturnsModal(false)} />

          {/* Modal Container */}
          <div
            className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            style={{ animation: "txSlideUp .2s ease" }}
          >
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground leading-tight">All Returned Items & Refunds</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      {filteredReturnItems.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activePeriodLabel} • Complete list of returned merchandise and refund records
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowReturnsModal(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 self-end sm:self-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Filter Toolbar */}
            <div className="shrink-0 px-6 py-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar inside Modal */}
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={returnsModalSearch}
                  onChange={(e) => setReturnsModalSearch(e.target.value)}
                  placeholder="Search return no, receipt, product, reason..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
                {returnsModalSearch && (
                  <button
                    onClick={() => setReturnsModalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status selector inside Modal */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                <select
                  value={returnsModalStatus}
                  onChange={(e) => setReturnsModalStatus(e.target.value)}
                  className="text-xs rounded-xl bg-card border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                >
                  <option value="all">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Scrollable Table inside Modal */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-4 py-3">Return No</th>
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">Returned Qty</th>
                    <th className="px-4 py-3 text-right">Refund Amount</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modalFilteredReturnItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        <Search size={28} className="mx-auto mb-2 opacity-30" />
                        No return records match "{returnsModalSearch || returnsModalStatus}".
                      </td>
                    </tr>
                  ) : (
                    modalFilteredReturnItems.map((ri, idx) => {
                      const statusColor =
                        ri.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : ri.status === "Approved"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : ri.status === "Pending"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-rose-100 text-rose-800 border-rose-200";

                      return (
                        <tr key={`modal-return-${ri.return_id}-${ri.return_item_id || idx}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-amber-700">
                            {ri.return_no}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {ri.receipt_no}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {ri.formatted_date || ri.date_ymd}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {ri.product_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[ri.category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                              {ri.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono text-foreground">
                            ×{ri.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600">
                            {peso(ri.refund_amount)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="font-semibold text-foreground">{ri.reason}</span>
                            {ri.customer_notes && (
                              <span className="block text-[11px] text-muted-foreground italic truncate max-w-xs" title={ri.customer_notes}>
                                "{ri.customer_notes}"
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${statusColor}`}>
                              {ri.status === "Completed" && <CheckCircle size={11} />}
                              {ri.status === "Approved" && <CheckCircle size={11} />}
                              {ri.status === "Pending" && <Clock size={11} />}
                              {ri.status === "Rejected" && <X size={11} />}
                              {ri.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-6 py-3 border-t border-border bg-card flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{modalFilteredReturnItems.length}</strong> of {filteredReturnItems.length} records
              </span>
              <button
                type="button"
                onClick={() => setShowReturnsModal(false)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4" style={{ animation: "txFadeIn .2s ease" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-foreground font-mono">{selectedTx.receipt_no}</h3>
                <p className="text-xs text-muted-foreground">{selectedTx.date}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Items on Receipt</p>
              {loadingTx ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading receipt details...</p>
              ) : txItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No individual items found for this receipt.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {txItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-border/50">
                      <span className="text-foreground">{item.name} <span className="text-muted-foreground">×{item.qty}</span></span>
                      <span className="font-bold text-foreground font-mono">{peso(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-extrabold text-foreground text-sm">Receipt Total</span>
              <span className="font-extrabold text-emerald-600 text-lg font-mono">{peso(Number(selectedTx.total_amount))}</span>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
