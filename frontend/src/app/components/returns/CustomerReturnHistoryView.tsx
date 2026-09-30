import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCcw, Search, CheckCircle, XCircle, AlertCircle,
  Receipt, ArrowRight, Package, DollarSign, Calendar,
  User, Eye, X, ChevronRight, ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { api, ProductReturn, ReturnItemRecord } from "../../../api";

function peso(amount: number | string) {
  return "₱" + Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerReturnHistoryView() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [search, setSearch] = useState("");

  const loadMyReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.returns.getMyHistory();
      setReturns(res);
    } catch (err: any) {
      console.error("Failed to load customer return history:", err);
      toast.error(err.message || "Failed to load return history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyReturns();
  }, [loadMyReturns]);

  const DISPLAY_LIMIT = 5;
  const recentReturns = returns.slice(0, DISPLAY_LIMIT);
  const hasMore = returns.length > DISPLAY_LIMIT;

  const totalRefunded = useMemo(() => {
    return returns.reduce((sum, r) => {
      if (r.status === "Completed" || r.status === "Approved") {
        return sum + Number(r.refund_amount);
      }
      return sum;
    }, 0);
  }, [returns]);

  const completedCount = useMemo(() => {
    return returns.filter(r => r.status === "Completed" || r.status === "Approved").length;
  }, [returns]);

  const filteredReturns = useMemo(() => {
    if (!search.trim()) return returns;
    const q = search.toLowerCase().trim();
    return returns.filter(r =>
      r.return_no.toLowerCase().includes(q) ||
      r.receipt_no.toLowerCase().includes(q) ||
      (r.reason && r.reason.toLowerCase().includes(q)) ||
      (r.cashier_name && r.cashier_name.toLowerCase().includes(q)) ||
      r.status.toLowerCase().includes(q)
    );
  }, [returns, search]);

  const handleSelectReturn = async (r: ProductReturn) => {
    setSelectedReturn(r);
    setLoadingDetails(true);
    try {
      const full = await api.returns.getById(r.id);
      setSelectedReturn(full);
    } catch {
      // keep basic details
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} /> Refund Completed
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={12} /> Under Review
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2.5">
            <RotateCcw size={24} className="text-emerald-600" /> Return History
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {hasMore
              ? `Showing recent ${recentReturns.length} of ${returns.length} return records`
              : `${returns.length} return record${returns.length === 1 ? "" : "s"} on file`}
          </p>
        </div>

        {hasMore && (
          <button
            onClick={() => { setShowAllModal(true); setSearch(""); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <ClipboardList size={16} /> View All Returns
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Returns</span>
            <RotateCcw size={16} className="text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-foreground font-mono mt-2">
            {returns.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Refunds Received</span>
            <CheckCircle size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            {completedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Total Refunded</span>
            <DollarSign size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-600 font-mono mt-2">
            {peso(totalRefunded)}
          </p>
        </div>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <RotateCcw size={28} className="animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Loading return history...</p>
        </div>
      ) : returns.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-card rounded-3xl border border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
            <RotateCcw size={26} />
          </div>
          <p className="text-base font-extrabold text-gray-800">No returns on record</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            You haven't processed any product returns. Any returns initiated at the store will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentReturns.map(r => (
            <div
              key={r.id}
              className="bg-card rounded-2xl border border-border p-5 shadow-xs hover:border-emerald-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-foreground text-sm font-mono">
                      {r.return_no}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      Receipt: {r.receipt_no}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Calendar size={12} className="text-gray-400" /> {r.created_at}
                    {r.cashier_name && (
                      <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                        · <User size={12} className="text-gray-400" /> Cashier: {r.cashier_name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-semibold text-gray-700 mt-2">
                    Reason: <span className="font-normal text-gray-600">{r.reason}</span>
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xl font-extrabold text-emerald-600 font-mono">
                    {peso(Number(r.refund_amount))}
                  </p>
                  <div className="mt-1">{getStatusBadge(r.status)}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                <span>
                  {r.total_items_quantity || r.item_count || 1} item{((r.total_items_quantity || r.item_count || 1) === 1) ? "" : "s"} returned
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectReturn(r)}
                  className="text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={13} /> View Return Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Return Details Modal ─── */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
                  <RotateCcw size={20} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold font-mono">{selectedReturn.return_no}</h3>
                    {getStatusBadge(selectedReturn.status)}
                  </div>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Receipt Ref: {selectedReturn.receipt_no}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">Receipt Number</span>
                  <span className="font-extrabold font-mono text-gray-800">{selectedReturn.receipt_no}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Cashier</span>
                  <span className="text-gray-800 font-semibold">{selectedReturn.cashier_name || "Cashier"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Date Returned</span>
                  <span className="text-gray-700">{selectedReturn.created_at}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Total Refund</span>
                  <span className="font-extrabold text-emerald-600 font-mono text-sm">{peso(selectedReturn.refund_amount)}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-2">
                  Items Returned
                </span>
                {loadingDetails ? (
                  <div className="py-6 flex justify-center text-gray-400">
                    <RotateCcw size={20} className="animate-spin text-emerald-600" />
                  </div>
                ) : selectedReturn.items && selectedReturn.items.length > 0 ? (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                    {selectedReturn.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50/50">
                        <div>
                          <p className="font-extrabold text-gray-900 text-sm">{item.product_name}</p>
                          <p className="text-gray-500 mt-0.5">
                            {item.quantity} unit(s) × {peso(item.unit_price)}
                          </p>
                        </div>
                        <span className="font-extrabold text-gray-900 font-mono text-sm">
                          {peso(item.refund_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-50 text-xs text-gray-500 text-center">
                    {selectedReturn.total_items_quantity || 1} item(s) refunded
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs space-y-1">
                <span className="font-bold text-amber-900 uppercase tracking-wide block">Reason for Return:</span>
                <p className="font-bold text-gray-900 text-sm">{selectedReturn.reason}</p>
                {selectedReturn.customer_notes && (
                  <p className="text-gray-700 mt-1 italic">"{selectedReturn.customer_notes}"</p>
                )}
              </div>

              {/* Store Decision Notes */}
              {selectedReturn.admin_notes && (
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                  <span className="text-gray-400 block font-semibold">Store Decision / Feedback:</span>
                  <p className="text-gray-800 font-medium">{selectedReturn.admin_notes}</p>
                  {selectedReturn.processed_by_username && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Processed by: {selectedReturn.processed_by_username} on {selectedReturn.processed_at}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Centered "All Returns" Modal ─── */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllModal(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 leading-tight">All Return History</h2>
                  <p className="text-xs text-gray-500">{returns.length} total return requests on file</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search return #, receipt, cashier..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredReturns.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <RotateCcw size={32} className="mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No returns match your search</p>
                  <p className="text-xs text-gray-400 mt-1">Try another keyword or receipt number.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3">Return No</th>
                      <th className="px-5 py-3">Receipt</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Cashier</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3 text-right">Refund</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReturns.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{r.return_no}</td>
                        <td className="px-5 py-3.5 font-mono text-gray-700">{r.receipt_no}</td>
                        <td className="px-5 py-3.5 text-gray-500">{r.created_at}</td>
                        <td className="px-5 py-3.5 text-gray-700 font-medium">{r.cashier_name || "Cashier"}</td>
                        <td className="px-5 py-3.5 text-gray-600 max-w-[140px] truncate">{r.reason}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-extrabold text-emerald-600">
                          {peso(r.refund_amount)}
                        </td>
                        <td className="px-5 py-3.5 text-center">{getStatusBadge(r.status)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAllModal(false);
                              handleSelectReturn(r);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
