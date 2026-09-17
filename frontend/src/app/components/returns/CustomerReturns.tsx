import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCcw, Package, Clock, CheckCircle, XCircle, AlertCircle,
  Plus, Search, Receipt, FileText, ChevronRight, Ban, Eye
} from "lucide-react";
import { toast } from "sonner";
import { api, ProductReturn, TransactionItem } from "../../../api";
import RequestReturnModal from "./RequestReturnModal";

function peso(amount: number | string) {
  return "₱" + Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerReturns() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // New return modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState<TransactionItem[]>([]);

  // Selected return for detailed modal
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [myReturns, history] = await Promise.all([
        api.returns.getMyReturns(),
        api.transactions.getMyHistory().catch(() => [])
      ]);
      setReturns(myReturns);
      setCustomerTransactions(history);
    } catch (err: any) {
      console.error("Error loading returns data:", err);
      toast.error(err.message || "Failed to load return records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelReturn = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this return request?")) return;
    try {
      await api.returns.cancel(id);
      toast.success("Return request cancelled");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel return request");
    }
  };

  // Metrics
  const totalCount = returns.length;
  const pendingCount = returns.filter(r => r.status === "Pending").length;
  const approvedCount = returns.filter(r => r.status === "Approved" || r.status === "Completed").length;
  const totalRefunded = returns
    .filter(r => r.status === "Approved" || r.status === "Completed")
    .reduce((sum, r) => sum + Number(r.refund_amount), 0);

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      if (filterStatus === "pending" && r.status !== "Pending") return false;
      if (filterStatus === "approved" && !(r.status === "Approved" || r.status === "Completed")) return false;
      if (filterStatus === "rejected" && r.status !== "Rejected") return false;
      if (filterStatus === "cancelled" && r.status !== "Cancelled") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNo = r.return_no.toLowerCase().includes(q);
        const matchReceipt = r.receipt_no.toLowerCase().includes(q);
        const matchReason = r.reason.toLowerCase().includes(q);
        const matchItems = r.items?.some(i => i.product_name.toLowerCase().includes(q));
        return matchNo || matchReceipt || matchReason || matchItems;
      }

      return true;
    });
  }, [returns, filterStatus, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="animate-pulse" /> Pending Review
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle size={13} /> Approved
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={13} /> Refund Completed
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={13} /> Return Rejected
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <Ban size={13} /> Cancelled
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2.5">
            <RotateCcw className="text-emerald-600" size={26} /> Product Returns & Refunds
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and request returns for items purchased from SmartMart
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus size={18} /> Request New Return
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Requests</span>
          <span className="text-2xl font-extrabold text-gray-900 font-mono mt-1 block">{totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">Pending Review</span>
          <span className="text-2xl font-extrabold text-amber-600 font-mono mt-1 block">{pendingCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Approved / Done</span>
          <span className="text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">{approvedCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">Total Refunded</span>
          <span className="text-2xl font-extrabold text-purple-600 font-mono mt-1 block">{peso(totalRefunded)}</span>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: "All Returns" },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "cancelled", label: "Cancelled" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search return #, receipt, item..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
          <RotateCcw size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Loading your return records...</p>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5">
            <RotateCcw size={28} />
          </div>
          <h3 className="text-base font-extrabold text-gray-900">No return requests found</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
            {search
              ? `No return records matching "${search}"`
              : "Need to return an item? You can submit a return request from any of your purchase records."}
          </p>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={15} /> Request Return Now
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReturns.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs hover:border-emerald-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-extrabold text-base text-gray-900 font-mono">
                      {r.return_no}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>Date Requested: <strong className="text-gray-700">{r.created_at}</strong></span>
                    <span>·</span>
                    <span>Original Receipt: <strong className="text-gray-700 font-mono">{r.receipt_no}</strong></span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-gray-400 block font-semibold">Refund Amount</span>
                  <span className="text-xl font-extrabold text-emerald-600 font-mono">
                    {peso(r.refund_amount)}
                  </span>
                </div>
              </div>

              {/* Items in Return */}
              <div className="py-3 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Items to Return
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {r.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 text-xs border border-gray-100"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-gray-400 text-[11px]">Qty: {item.quantity} × {peso(item.unit_price)}</p>
                      </div>
                      <span className="font-extrabold text-gray-900 font-mono shrink-0">
                        {peso(item.refund_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason & Notes */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-gray-600">
                    <strong className="text-gray-900">Reason:</strong> {r.reason}
                    {r.customer_notes && <span className="text-gray-500 ml-1.5">— "{r.customer_notes}"</span>}
                  </p>
                  {r.admin_notes && (
                    <p className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-100">
                      <strong>Store Response:</strong> {r.admin_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "Pending" && (
                    <button
                      onClick={() => handleCancelReturn(r.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedReturn(r)}
                    className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={13} /> View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Request Modal */}
      {showRequestModal && (
        <RequestReturnModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={loadData}
          customerTransactions={customerTransactions}
        />
      )}

      {/* Return Details Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-emerald-600 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-200 block font-bold uppercase tracking-wider">Return Receipt</span>
                <h3 className="text-lg font-extrabold font-mono">{selectedReturn.return_no}</h3>
              </div>
              <div>{getStatusBadge(selectedReturn.status)}</div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div>
                  <span className="text-gray-400 block">Original Purchase</span>
                  <span className="font-extrabold font-mono text-gray-800">{selectedReturn.receipt_no}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Requested At</span>
                  <span className="font-semibold text-gray-700">{selectedReturn.created_at}</span>
                </div>
                {selectedReturn.processed_at && (
                  <div>
                    <span className="text-gray-400 block">Processed Date</span>
                    <span className="font-semibold text-gray-700">{selectedReturn.processed_at}</span>
                  </div>
                )}
                {selectedReturn.processed_by_username && (
                  <div>
                    <span className="text-gray-400 block">Staff in Charge</span>
                    <span className="font-semibold text-gray-700">{selectedReturn.processed_by_username}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-bold uppercase text-gray-500 block mb-2">Returned Items</span>
                <div className="space-y-2">
                  {selectedReturn.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-gray-100 bg-white">
                      <div>
                        <p className="font-extrabold text-gray-900">{item.product_name}</p>
                        <p className="text-gray-400">{item.quantity} × {peso(item.unit_price)}</p>
                      </div>
                      <span className="font-extrabold text-emerald-600 font-mono">{peso(item.refund_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between font-extrabold text-sm text-gray-900">
                  <span>Total Refund Amount</span>
                  <span className="text-emerald-600 font-mono">{peso(selectedReturn.refund_amount)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-gray-400 block">Reason:</span>
                  <p className="text-gray-800 font-medium">{selectedReturn.reason}</p>
                </div>
                {selectedReturn.customer_notes && (
                  <div>
                    <span className="text-gray-400 block">Customer Notes:</span>
                    <p className="text-gray-700">{selectedReturn.customer_notes}</p>
                  </div>
                )}
                {selectedReturn.admin_notes && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-gray-400 block">Store Notes:</span>
                    <p className="text-emerald-700 font-medium">{selectedReturn.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedReturn(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
