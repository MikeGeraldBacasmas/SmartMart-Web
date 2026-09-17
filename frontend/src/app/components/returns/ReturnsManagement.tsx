import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCcw, Search, Clock, CheckCircle, XCircle, AlertCircle,
  Filter, Eye, Check, X, ShieldCheck, ArrowRight, Package, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { api, ProductReturn, ReturnItemRecord } from "../../../api";

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} className="animate-pulse" /> Pending Review
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} /> Refund Completed
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
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
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2.5">
            <RotateCcw className="text-emerald-600" size={26} /> Product Returns Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review customer return requests, inspect items, issue refunds, and adjust inventory stock
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Returns</span>
            <RotateCcw size={16} className="text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 font-mono mt-2">{summary.total_returns || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Review</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 font-mono mt-2">{summary.pending_count || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Refunded & Done</span>
            <CheckCircle size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            {(summary.approved_count || 0) + (summary.completed_count || 0)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Refunded</span>
            <DollarSign size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-600 font-mono mt-2">
            {peso(summary.total_refunded || 0)}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {["All", "Pending", "Approved", "Completed", "Rejected"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                statusFilter === status
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
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
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search return #, receipt, customer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-gray-400 space-y-3">
            <RotateCcw size={32} className="animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Loading return requests...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <RotateCcw size={24} />
            </div>
            <p className="text-sm font-bold text-gray-800">No return requests found</p>
            <p className="text-xs text-gray-500 mt-1">There are no return requests matching your current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Return No</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Receipt Reference</th>
                  <th className="px-5 py-3.5">Date Requested</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5 text-right">Refund Total</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-extrabold text-gray-900">
                      {ret.return_no}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{ret.customer_name || "Customer"}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{ret.customer_code}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                        {ret.receipt_no}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {ret.created_at}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-800">{ret.total_items_quantity || 1}</span> items
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-extrabold text-emerald-600">
                      {peso(ret.refund_amount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(ret.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openReviewModal(ret)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                          ret.status === "Pending"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {ret.status === "Pending" ? "Review & Process" : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review / Process Modal */}
      {reviewReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold font-mono">{reviewReturn.return_no}</h3>
                  {getStatusBadge(reviewReturn.status)}
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  Requested by {reviewReturn.customer_name} ({reviewReturn.customer_code})
                </p>
              </div>
              <button
                onClick={() => setReviewReturn(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Return Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">Receipt Number</span>
                  <span className="font-extrabold font-mono text-gray-800">{reviewReturn.receipt_no}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Date Requested</span>
                  <span className="text-gray-700">{reviewReturn.created_at}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Contact Phone</span>
                  <span className="text-gray-700 font-mono">{reviewReturn.customer_phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Total Refund</span>
                  <span className="font-extrabold text-emerald-600 font-mono text-sm">{peso(reviewReturn.refund_amount)}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-2">
                  Items to Return
                </span>
                <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  {reviewReturn.items?.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50/50">
                      <div>
                        <p className="font-extrabold text-gray-900 text-sm">{item.product_name}</p>
                        <p className="text-gray-500">
                          {item.quantity} unit(s) × {peso(item.unit_price)}
                          {item.current_stock !== undefined && (
                            <span className="ml-2 text-gray-400 font-mono">
                              (Current store stock: {item.current_stock})
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-extrabold text-gray-900 font-mono text-sm">
                        {peso(item.refund_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Stated Reason */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs space-y-1">
                <span className="font-bold text-amber-900 uppercase tracking-wide block">Customer's Stated Reason:</span>
                <p className="font-bold text-gray-900 text-sm">{reviewReturn.reason}</p>
                {reviewReturn.customer_notes && (
                  <p className="text-gray-700 mt-1 italic">"{reviewReturn.customer_notes}"</p>
                )}
              </div>

              {/* Restock & Staff Notes */}
              {reviewReturn.status === "Pending" ? (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={e => setRestock(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Restock item(s) back into store inventory</p>
                      <p className="text-[11px] text-gray-500">
                        Automatically increment the products' stock counts upon approval
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                      Store Decision Notes / Feedback
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="e.g., Items inspected at counter; refund paid in cash."
                      className="w-full p-3 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                reviewReturn.admin_notes && (
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <span className="text-gray-400 block font-semibold">Store Processing Notes:</span>
                    <p className="text-gray-800 font-medium">{reviewReturn.admin_notes}</p>
                    {reviewReturn.processed_by_username && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Processed by: {reviewReturn.processed_by_username} on {reviewReturn.processed_at}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setReviewReturn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Close
              </button>

              {reviewReturn.status === "Pending" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("Rejected")}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Reject Return
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("Completed")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
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
