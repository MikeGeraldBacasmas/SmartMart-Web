import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCcw, Search, Clock, CheckCircle, XCircle, AlertCircle,
  Filter, Eye, Check, X, ShieldCheck, ArrowRight, Package, DollarSign,
  Plus, User, Receipt, ArrowLeft, Phone, Calendar, ShoppingBag, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { api, ProductReturn, ReturnItemRecord, RegisteredCustomer, TransactionItem } from "../../../api";
import RequestReturnModal from "./RequestReturnModal";

function peso(amount: number | string) {
  return "₱" + Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ReturnsManagementProps {
  role?: "admin" | "staff";
  onReturnsUpdated?: () => void;
}

export default function ReturnsManagement({ role = "admin", onReturnsUpdated }: ReturnsManagementProps) {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [summary, setSummary] = useState<any>({
    total_returns: 0,
    pending_count: 0,
    approved_count: 0,
    completed_count: 0,
    rejected_count: 0,
    total_refunded: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  // Review modal state
  const [reviewReturn, setReviewReturn] = useState<ProductReturn | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [restock, setRestock] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Walk-In Return workflow state
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [allCustomers, setAllCustomers] = useState<RegisteredCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<RegisteredCustomer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<TransactionItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [customerReturns, setCustomerReturns] = useState<ProductReturn[]>([]);
  const [loadingCustomerReturns, setLoadingCustomerReturns] = useState(false);
  const [customerViewTab, setCustomerViewTab] = useState<"receipts" | "returns">("receipts");
  const [selectedTxIdForReturn, setSelectedTxIdForReturn] = useState<number | null>(null);
  const [receiptSearch, setReceiptSearch] = useState("");

  // Quick Receipt preview state
  const [previewReceipt, setPreviewReceipt] = useState<TransactionItem | null>(null);
  const [previewItems, setPreviewItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.returns.getAll({
        status: statusFilter === "All" ? undefined : statusFilter,
        search: search.trim() || undefined
      });
      setReturns(res.returns);
      setSummary(res.summary);
      if (onReturnsUpdated) onReturnsUpdated();
    } catch (err: any) {
      console.error("Error loading returns:", err);
      toast.error(err.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, onReturnsUpdated]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  // Open Walk-in return modal & load customer list
  const openWalkInModal = async () => {
    if (role === "admin") {
      toast.error("Admin accounts have view-only access. Only staff can process returns.");
      return;
    }
    setIsWalkInOpen(true);
    setSelectedCustomer(null);
    setCustomerTransactions([]);
    setCustomerReturns([]);
    setCustomerViewTab("receipts");
    setCustomerSearch("");
    setReceiptSearch("");
    setLoadingCustomers(true);
    try {
      const list = await api.customers.getRegistered();
      setAllCustomers(list);
    } catch (err: any) {
      toast.error(err.message || "Failed to load customer list");
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Select customer and fetch their purchase history (receipts) & return history
  const handleSelectCustomer = async (cust: RegisteredCustomer) => {
    setSelectedCustomer(cust);
    setReceiptSearch("");
    setCustomerViewTab("receipts");
    setCustomerReturns([]);
    setLoadingTransactions(true);
    setLoadingCustomerReturns(true);

    api.returns.getCustomerReturns(cust.id)
      .then(rets => setCustomerReturns(rets))
      .catch(() => setCustomerReturns([]))
      .finally(() => setLoadingCustomerReturns(false));

    try {
      const txs = await api.transactions.getCustomerTransactions(cust.id);
      setCustomerTransactions(txs);
    } catch (err: any) {
      toast.error(err.message || "Failed to load customer purchase history");
      setCustomerTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Quick preview of receipt items
  const handlePreviewReceipt = async (t: TransactionItem) => {
    setPreviewReceipt(t);
    if (t.items && t.items.length > 0) {
      setPreviewItems(t.items.map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: Number(i.unit_price)
      })));
      setLoadingPreview(false);
      return;
    }
    setLoadingPreview(true);
    try {
      const items: any = await api.transactions.getItems(t.id);
      setPreviewItems(items.map((i: any) => ({
        name: i.product_name,
        qty: i.quantity,
        price: Number(i.unit_price)
      })));
    } catch {
      setPreviewItems([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return allCustomers;
    const q = customerSearch.toLowerCase();
    return allCustomers.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      c.customer_code.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  }, [allCustomers, customerSearch]);

  const filteredTransactions = useMemo(() => {
    if (!receiptSearch.trim()) return customerTransactions;
    const q = receiptSearch.toLowerCase().trim();
    return customerTransactions.filter(tx => {
      // 1. Match receipt number (e.g. TRX-2026-0024 or 0024)
      if (tx.receipt_no.toLowerCase().includes(q)) return true;
      // 2. Match cashier name
      if (tx.cashier && tx.cashier.toLowerCase().includes(q)) return true;
      // 3. Match purchase date
      if (tx.date && tx.date.toLowerCase().includes(q)) return true;
      // 4. Match total amount or cash
      if (String(tx.total_amount).includes(q)) return true;
      // 5. Match item name in items array
      if (tx.items && tx.items.some(i => i.product_name.toLowerCase().includes(q))) return true;
      // 6. Match items_summary string
      if (tx.items_summary && tx.items_summary.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [customerTransactions, receiptSearch]);

  const openReviewModal = async (ret: ProductReturn) => {
    setReviewLoading(true);
    setAdminNotes(ret.admin_notes || "");
    setRestock(true);
    try {
      const fullDetails = await api.returns.getById(ret.id);
      setReviewReturn(fullDetails);
    } catch (err: any) {
      toast.error(err.message || "Failed to load return details");
      setReviewReturn(ret);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleUpdateStatus = async (status: "Approved" | "Completed" | "Rejected") => {
    if (!reviewReturn) return;

    if (status === "Rejected" && !adminNotes.trim()) {
      toast.error("Please provide a reason or note when rejecting a return");
      return;
    }

    setActionLoading(true);
    try {
      await api.returns.updateStatus(reviewReturn.id, {
        status,
        admin_notes: adminNotes.trim(),
        restock: status !== "Rejected" ? restock : false
      });

      toast.success(`Return marked as ${status}`);
      setReviewReturn(null);
      loadReturns();
    } catch (err: any) {
      toast.error(err.message || "Failed to update return status");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock size={12} className="animate-pulse" /> Pending Review
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle size={12} /> Refund Completed
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2.5">
              <RotateCcw className="text-emerald-600 dark:text-emerald-500" size={26} /> Product Returns Management
            </h1>
            {role === "admin" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Eye size={12} /> View Only
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {role === "admin"
              ? "View and monitor product returns, review customer receipts, inspect items, and track refund history"
              : "Process walk-in returns, review past returns, inspect items, and manage refunds"}
          </p>
        </div>

        {role !== "admin" && (
          <button
            onClick={openWalkInModal}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} /> Process Walk-In Return
          </button>
        )}
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Returns</span>
            <RotateCcw size={16} className="text-muted-foreground/70" />
          </div>
          <p className="text-2xl font-extrabold text-foreground font-mono mt-2">{summary.total_returns || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Rejected Returns</span>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-red-500 font-mono mt-2">{summary.rejected_count || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Refunded & Done</span>
            <CheckCircle size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-500 font-mono mt-2">
            {(summary.approved_count || 0) + (summary.completed_count || 0)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">Total Refunded</span>
            <DollarSign size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-500 font-mono mt-2">
            {peso(summary.total_refunded || 0)}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border rounded-2xl w-full sm:w-auto overflow-x-auto">
          {(Number(summary.pending_count) > 0
            ? ["All", "Pending", "Approved", "Completed", "Rejected"]
            : ["All", "Approved", "Completed", "Rejected"]
          ).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {status}
              {status === "Pending" && Number(summary.pending_count) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                  {summary.pending_count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search return #, receipt, customer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-card rounded-3xl border border-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-3">
            <RotateCcw size={32} className="animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <RotateCcw size={24} />
            </div>
            <p className="text-sm font-bold text-foreground">No return records found</p>
            <p className="text-xs text-muted-foreground mt-1">There are no returns matching your current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Return No</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Receipt Reference</th>
                  <th className="px-5 py-3.5">Date Created</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5 text-right">Refund Total</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-extrabold text-foreground">
                      {ret.return_no}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-foreground">{ret.customer_name || "Customer"}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{ret.customer_code}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-foreground bg-muted border border-border/60 px-2 py-1 rounded-md">
                        {ret.receipt_no}
                      </span>
                      {ret.cashier_name && (
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                          <User size={11} className="text-muted-foreground" /> Cashier: {ret.cashier_name}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {ret.created_at}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-foreground">{ret.total_items_quantity || 1}</span> <span className="text-muted-foreground">items</span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-extrabold text-emerald-500">
                      {peso(ret.refund_amount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(ret.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openReviewModal(ret)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                          ret.status === "Pending" && role !== "admin"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                        }`}
                      >
                        {ret.status === "Pending" && role !== "admin" ? "Review & Process" : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Walk-In Return Modal: Search Customer & View Receipts ─── */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-foreground">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
                  <RotateCcw size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold leading-tight">Walk-In Return: Customer & Receipt Lookup</h2>
                  <p className="text-xs text-emerald-100">
                    Search customer account to track purchases and view receipt for verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWalkInOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!selectedCustomer ? (
                /* Step 1: Customer Search */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Step 1: Find Customer</h3>
                      <p className="text-xs text-muted-foreground">Search customer by name, customer code, or phone number</p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {filteredCustomers.length} registered customers
                    </span>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Type customer name, code (e.g., CUST-0001), or phone..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-muted/60 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {loadingCustomers ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <RotateCcw size={24} className="animate-spin text-emerald-600" />
                      <p className="text-xs font-semibold">Loading customer database...</p>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground space-y-2">
                      <User size={32} className="mx-auto opacity-30" />
                      <p className="text-sm font-semibold text-foreground">No matching customer found</p>
                      <p className="text-xs text-muted-foreground">Try searching with a different name or code</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border max-h-[360px] overflow-y-auto">
                      {filteredCustomers.map(cust => (
                        <div
                          key={cust.id}
                          onClick={() => handleSelectCustomer(cust)}
                          className="p-4 flex items-center justify-between hover:bg-emerald-500/10 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold text-sm group-hover:scale-105 transition-transform">
                              {cust.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {cust.full_name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground border border-border/50">
                                  {cust.customer_code}
                                </span>
                                {cust.phone && <span>· {cust.phone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[11px] text-muted-foreground block">Total Purchases</span>
                              <span className="text-xs font-extrabold text-foreground font-mono">
                                {cust.total_purchases || 0}
                              </span>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl bg-muted group-hover:bg-emerald-600 group-hover:text-white text-xs font-bold text-foreground transition-colors flex items-center gap-1 border border-border/60">
                              Select <ArrowRight size={13} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Customer Selected, View Receipts */
                <div className="space-y-5">
                  {/* Selected Customer Header Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                        {selectedCustomer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-foreground">{selectedCustomer.full_name}</h4>
                          <span className="font-mono text-xs font-bold bg-card text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            {selectedCustomer.customer_code}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {selectedCustomer.phone && <span>Phone: {selectedCustomer.phone} ·</span>}
                          <span>Joined: {selectedCustomer.joined || "Registered"}</span>
                          {customerTransactions.find(t => t.cashier)?.cashier && (
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-card px-2 py-0.5 rounded-md border border-emerald-500/30">
                              <User size={12} className="text-emerald-500" /> Cashier: {customerTransactions.find(t => t.cashier)?.cashier}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerTransactions([]);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Change Customer
                    </button>
                  </div>

                  {/* Tabs: Purchase Receipts vs Return History */}
                  <div className="flex items-center gap-1.5 border-b border-border">
                    <button
                      type="button"
                      onClick={() => setCustomerViewTab("receipts")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer ${
                        customerViewTab === "receipts"
                          ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-t-xl"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Receipt size={14} /> Purchase Receipts ({customerTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerViewTab("returns")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer ${
                        customerViewTab === "returns"
                          ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-t-xl"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <RotateCcw size={14} /> Return History ({customerReturns.length})
                    </button>
                  </div>

                  {customerViewTab === "returns" ? (
                    /* Customer Return History View */
                    loadingCustomerReturns ? (
                      <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                        <RotateCcw size={24} className="animate-spin text-emerald-600" />
                        <p className="text-xs font-semibold">Loading customer return history...</p>
                      </div>
                    ) : customerReturns.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl p-6">
                        <RotateCcw size={32} className="mx-auto opacity-30 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No return history on record</p>
                        <p className="text-xs text-muted-foreground mt-1">This customer does not have any recorded returns.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerReturns.map(ret => (
                          <div
                            key={ret.id}
                            className="p-4 rounded-2xl border border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-extrabold text-sm text-foreground">{ret.return_no}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded-md border border-border/60">
                                  Receipt: {ret.receipt_no}
                                </span>
                                {getStatusBadge(ret.status)}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>{ret.created_at}</span>
                                {ret.cashier_name && (
                                  <span>· Cashier: <strong className="text-foreground">{ret.cashier_name}</strong></span>
                                )}
                                <span>· {ret.total_items_quantity || ret.item_count || 1} item(s)</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Reason: <span className="font-medium text-foreground">{ret.reason}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <span className="text-base font-mono font-extrabold text-emerald-500">
                                {peso(ret.refund_amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openReviewModal(ret)}
                                className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer border border-border"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    /* Purchase Receipts Section */
                    <div className="space-y-4">
                      {/* Search Bar for Receipts & Return Items */}
                      <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={receiptSearch}
                          onChange={e => setReceiptSearch(e.target.value)}
                          placeholder="Search item to return (e.g., Corned Beef, Soap), receipt #, date, cashier..."
                          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl bg-muted/60 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        {receiptSearch && (
                          <button
                            type="button"
                            onClick={() => setReceiptSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors cursor-pointer"
                            title="Clear search"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                            <Receipt size={16} className="text-emerald-500" />
                            Purchase Receipts ({customerTransactions.length})
                          </h3>
                          {receiptSearch.trim() && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                              {filteredTransactions.length} matching
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Select the receipt for the item being returned
                        </span>
                      </div>

                    {loadingTransactions ? (
                      <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                        <RotateCcw size={24} className="animate-spin text-emerald-600" />
                        <p className="text-xs font-semibold">Loading purchase receipts...</p>
                      </div>
                    ) : customerTransactions.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl p-6">
                        <Receipt size={32} className="mx-auto opacity-30 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No purchases found for this customer</p>
                        <p className="text-xs text-muted-foreground mt-1">This customer does not have any recorded transactions in the system.</p>
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-2xl p-6">
                        <Search size={28} className="mx-auto opacity-30 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No receipts match "{receiptSearch}"</p>
                        <p className="text-xs text-muted-foreground mt-1">Try searching with another item name, receipt number, or date.</p>
                        <button
                          type="button"
                          onClick={() => setReceiptSearch("")}
                          className="mt-3 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer border border-emerald-500/30"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredTransactions.map(tx => {
                          const isTxFullyReturned = Boolean(
                            tx.is_fully_returned ||
                            (tx.items && tx.items.length > 0 && tx.items.every(it => it.is_fully_returned || (it.already_returned !== undefined && it.already_returned >= it.quantity)))
                          );
                          const hasReturnedItems = Boolean(tx.has_returned_items || (tx.items && tx.items.some(it => it.already_returned !== undefined && it.already_returned > 0)));

                          return (
                            <div
                              key={tx.id}
                              className="p-4 rounded-2xl border border-border hover:border-emerald-500/40 bg-card hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-extrabold text-sm text-foreground">
                                      {tx.receipt_no}
                                    </span>
                                    {isTxFullyReturned ? (
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                        Already Returned
                                      </span>
                                    ) : hasReturnedItems ? (
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                        Partially Returned
                                      </span>
                                    ) : (
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span>{tx.date}</span>
                                    <span>·</span>
                                    <span>Cashier: {tx.cashier}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                                  <div className="text-left sm:text-right">
                                    <span className="text-[11px] text-muted-foreground block font-semibold">Total Paid</span>
                                    <span className="text-sm font-extrabold font-mono text-foreground">
                                      {peso(tx.total_amount)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewReceipt(tx)}
                                      className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-border"
                                    >
                                      <Eye size={13} /> View Receipt
                                    </button>
                                    {isTxFullyReturned ? (
                                      <span className="px-3 py-2 rounded-xl bg-muted text-muted-foreground border border-border text-xs font-bold flex items-center gap-1.5 cursor-default">
                                        <CheckCircle2 size={13} className="text-muted-foreground" /> Already Returned
                                      </span>
                                    ) : role !== "admin" ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTxIdForReturn(tx.id)}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <RotateCcw size={13} /> Return Items
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {/* Item badges with match highlighting */}
                              {tx.items && tx.items.length > 0 && (
                                <div className="mt-1 pt-2.5 border-t border-border flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
                                    <Package size={12} className="text-muted-foreground" /> Items:
                                  </span>
                                  {isTxFullyReturned ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-muted text-muted-foreground border border-border">
                                      <AlertCircle size={11} className="text-muted-foreground" /> Already Returned
                                    </span>
                                  ) : (
                                    <>
                                      {tx.items
                                        .filter(it => it.is_returnable !== false && (it.available_quantity === undefined || it.available_quantity > 0))
                                        .map((it, idx) => {
                                          const isMatched = receiptSearch.trim() && it.product_name.toLowerCase().includes(receiptSearch.toLowerCase().trim());
                                          const displayQty = it.available_quantity !== undefined ? it.available_quantity : it.quantity;
                                          return (
                                            <span
                                              key={idx}
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] transition-all ${
                                                isMatched
                                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 font-extrabold shadow-xs"
                                                  : "bg-muted text-foreground border border-border font-medium"
                                              }`}
                                            >
                                              <span>{it.product_name}</span>
                                              <span className="text-[10px] text-muted-foreground font-mono font-bold">×{displayQty}</span>
                                            </span>
                                          );
                                        })}
                                      {hasReturnedItems && (
                                        <span className="text-[10px] font-bold text-muted-foreground italic ml-1">
                                          (already returned items excluded)
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground">
                {selectedCustomer ? `Selected: ${selectedCustomer.full_name}` : "Step 1 of 2: Select customer"}
              </span>
              <button
                type="button"
                onClick={() => setIsWalkInOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Inspection Modal ─── */}
      {previewReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-border text-foreground">
            <div className="bg-emerald-600 p-5 text-center text-white">
              <Receipt size={32} className="mx-auto mb-1.5" />
              <h3 className="font-extrabold text-base">Receipt Verification</h3>
              <p className="text-emerald-100 text-xs font-mono">{previewReceipt.receipt_no}</p>
            </div>

            <div className="p-5 space-y-3 font-mono text-xs max-h-[60vh] overflow-y-auto">
              <div className="text-center border-b border-dashed border-border pb-3">
                <p className="font-extrabold text-base font-sans text-foreground">SmartMart</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{previewReceipt.date}</p>
                <p className="text-[11px] text-muted-foreground">Cashier: {previewReceipt.cashier}</p>
                {selectedCustomer && (
                  <p className="text-[11px] text-emerald-500 font-sans font-bold mt-1">Customer: {selectedCustomer.full_name}</p>
                )}
              </div>

              {loadingPreview ? (
                <div className="py-6 text-center text-muted-foreground font-sans">
                  <RotateCcw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                  <p>Loading items...</p>
                </div>
              ) : previewItems.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground font-sans">No items found on receipt</p>
              ) : (
                <div className="space-y-1.5">
                  {previewReceipt.items && previewReceipt.items.length > 0 ? (
                    previewReceipt.items.map((item: any, idx: number) => {
                      const isItemFullyReturned = Boolean(item.is_fully_returned || (item.already_returned !== undefined && item.already_returned >= item.quantity));
                      const hasPartialReturn = item.already_returned > 0 && !isItemFullyReturned;
                      return (
                        <div key={idx} className={`flex justify-between items-center ${isItemFullyReturned ? "opacity-50" : "text-foreground"}`}>
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className={isItemFullyReturned ? "line-through text-muted-foreground" : ""}>
                              {item.product_name} ×{item.quantity}
                            </span>
                            {isItemFullyReturned && (
                              <span className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase shrink-0 flex items-center gap-1 border border-border">
                                <CheckCircle2 size={10} className="text-muted-foreground" /> Already Returned
                              </span>
                            )}
                            {hasPartialReturn && (
                              <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0 border border-amber-500/30">
                                {item.already_returned} returned
                              </span>
                            )}
                          </div>
                          <span className={`font-bold shrink-0 ${isItemFullyReturned ? "line-through text-muted-foreground" : ""}`}>
                            {peso(Number(item.unit_price) * item.quantity)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    previewItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-foreground">
                        <span className="truncate pr-2">{item.name} ×{item.qty}</span>
                        <span className="font-bold shrink-0">{peso(item.price * item.qty)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="border-t border-dashed border-border pt-3 space-y-1">
                <div className="flex justify-between font-extrabold text-foreground text-sm">
                  <span>TOTAL PAID</span>
                  <span>{peso(Number(previewReceipt.total_amount))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Cash Tendered</span>
                  <span>{peso(Number(previewReceipt.cash_tendered))}</span>
                </div>
                <div className="flex justify-between font-extrabold text-emerald-500 text-xs">
                  <span>Change</span>
                  <span>{peso(Number(previewReceipt.change_amount))}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border-t border-border flex gap-2">
              {previewReceipt.is_fully_returned || (previewReceipt.items && previewReceipt.items.length > 0 && previewReceipt.items.every((i: any) => i.is_fully_returned || (i.already_returned !== undefined && i.already_returned >= i.quantity))) ? (
                <div className="flex-1 py-2.5 bg-muted text-muted-foreground border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-default">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Already Returned
                </div>
              ) : role !== "admin" ? (
                <button
                  type="button"
                  onClick={() => {
                    const txId = previewReceipt.id;
                    setPreviewReceipt(null);
                    setSelectedTxIdForReturn(txId);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={14} /> Process Return
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Staff Walk-In Request Return Modal ─── */}
      {selectedTxIdForReturn !== null && (
        <RequestReturnModal
          transactionId={selectedTxIdForReturn}
          customerName={selectedCustomer?.full_name}
          customerTransactions={customerTransactions}
          onClose={() => setSelectedTxIdForReturn(null)}
          onSuccess={async () => {
            setSelectedTxIdForReturn(null);
            setIsWalkInOpen(false);
            if (selectedCustomer) {
              try {
                const refreshed = await api.transactions.getCustomerTransactions(selectedCustomer.id);
                setCustomerTransactions(refreshed);
                const refreshedRets = await api.returns.getCustomerReturns(selectedCustomer.id);
                setCustomerReturns(refreshedRets);
              } catch {}
            }
            loadReturns();
          }}
        />
      )}

      {/* ─── Review / Process Modal ─── */}
      {reviewReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-foreground">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold font-mono">{reviewReturn.return_no}</h3>
                  {getStatusBadge(reviewReturn.status)}
                  {role === "admin" && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
                      <Eye size={10} /> View Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Customer: {reviewReturn.customer_name} ({reviewReturn.customer_code})
                </p>
              </div>
              <button
                onClick={() => setReviewReturn(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Return Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block font-semibold">Receipt Number</span>
                  <span className="font-extrabold font-mono text-foreground">{reviewReturn.receipt_no}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-semibold">Cashier</span>
                  <span className="text-foreground font-semibold flex items-center gap-1">
                    <User size={12} className="text-muted-foreground" />
                    {reviewReturn.cashier_name || "Cashier"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-semibold">Date Created</span>
                  <span className="text-foreground">{reviewReturn.created_at}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-semibold">Contact Phone</span>
                  <span className="text-foreground font-mono">{reviewReturn.customer_phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-semibold">Total Refund</span>
                  <span className="font-extrabold text-emerald-500 font-mono text-sm">{peso(reviewReturn.refund_amount)}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Items to Return
                </span>
                <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {reviewReturn.items?.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/30">
                      <div>
                        <p className="font-extrabold text-foreground text-sm">{item.product_name}</p>
                        <p className="text-muted-foreground">
                          {item.quantity} unit(s) × {peso(item.unit_price)}
                          {item.current_stock !== undefined && (
                            <span className="ml-2 text-muted-foreground font-mono">
                              (Current store stock: {item.current_stock})
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-extrabold text-foreground font-mono text-sm">
                        {peso(item.refund_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide block">Reason for Return:</span>
                <p className="font-bold text-foreground text-sm">{reviewReturn.reason}</p>
                {reviewReturn.customer_notes && (
                  <p className="text-muted-foreground mt-1 italic">"{reviewReturn.customer_notes}"</p>
                )}
              </div>

              {/* Restock & Staff Notes */}
              {reviewReturn.status === "Pending" && role !== "admin" ? (
                <div className="space-y-4 pt-2 border-t border-border">
                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={e => setRestock(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-border focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">Restock item(s) back into store inventory</p>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically increment the products' stock counts upon approval
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Store Decision Notes / Feedback
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="e.g., Items inspected at counter; refund paid in cash."
                      className="w-full p-3 text-xs rounded-xl border border-border bg-muted/60 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : reviewReturn.status === "Pending" && role === "admin" ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2.5">
                  <Clock size={16} className="text-amber-500 shrink-0" />
                  <span><strong>Pending Staff Review:</strong> This return request is awaiting counter inspection and processing by staff. Admin accounts have view-only access.</span>
                </div>
              ) : (
                reviewReturn.admin_notes && (
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
                    <span className="text-muted-foreground block font-semibold">Store Processing Notes:</span>
                    <p className="text-foreground font-medium">{reviewReturn.admin_notes}</p>
                    {reviewReturn.processed_by_username && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Processed by: {reviewReturn.processed_by_username} on {reviewReturn.processed_at}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setReviewReturn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors border border-border cursor-pointer"
              >
                Close
              </button>

              {reviewReturn.status === "Pending" && role !== "admin" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("Rejected")}
                    className="px-4 py-2.5 rounded-xl border border-red-500/30 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Reject Return
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("Completed")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle size={14} /> Approve & Complete Refund
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
