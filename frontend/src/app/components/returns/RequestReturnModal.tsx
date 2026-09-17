import React, { useState, useEffect } from "react";
import {
  X, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, Package,
  FileText, ArrowRight, ShieldAlert, ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import { api, ReturnableItem, ReturnableItemsResponse, TransactionItem } from "../../../api";

interface RequestReturnModalProps {
  transactionId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
  customerTransactions?: TransactionItem[];
}

const RETURN_REASONS = [
  "Defective / Damaged",
  "Expired Product",
  "Wrong Item Received",
  "Quality Issue / Spoiled",
  "Incorrect Size / Packaging",
  "Changed Mind / Dissatisfied",
  "Other"
];

function peso(amount: number) {
  return "₱" + amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RequestReturnModal({
  transactionId: initialTxId,
  onClose,
  onSuccess,
  customerTransactions = []
}: RequestReturnModalProps) {
  const [selectedTxId, setSelectedTxId] = useState<number | null>(initialTxId || null);
  const [data, setData] = useState<ReturnableItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected items to return: map of transaction_item_id -> return quantity
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // If no initialTxId, and customer has transactions, preselect first one
  useEffect(() => {
    if (!initialTxId && customerTransactions.length > 0 && selectedTxId === null) {
      setSelectedTxId(customerTransactions[0].id);
    }
  }, [initialTxId, customerTransactions, selectedTxId]);

  // Fetch returnable items whenever selectedTxId changes
  useEffect(() => {
    if (!selectedTxId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setSelectedQuantities({});

    api.returns.getReturnableItems(selectedTxId)
      .then(res => {
        if (mounted) {
          setData(res);
          // Automatically select the first returnable item with qty 1 for convenience
          const firstReturnable = res.items.find(i => i.is_returnable);
          if (firstReturnable) {
            setSelectedQuantities({ [firstReturnable.transaction_item_id]: 1 });
          }
        }
      })
      .catch(err => {
        if (mounted) setError(err.message || "Failed to load transaction items");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [selectedTxId]);

  const toggleItemSelection = (item: ReturnableItem) => {
    if (!item.is_returnable) return;
    setSelectedQuantities(prev => {
      const next = { ...prev };
      if (next[item.transaction_item_id] !== undefined) {
        delete next[item.transaction_item_id];
      } else {
        next[item.transaction_item_id] = 1;
      }
      return next;
    });
  };

  const setItemQuantity = (item: ReturnableItem, qty: number) => {
    const validQty = Math.max(1, Math.min(qty, item.available_quantity));
    setSelectedQuantities(prev => ({
      ...prev,
      [item.transaction_item_id]: validQty
    }));
  };

  // Calculate totals
  const selectedItemsList = data?.items.filter(i => selectedQuantities[i.transaction_item_id] !== undefined) || [];
  const totalRefund = selectedItemsList.reduce((sum, item) => {
    const qty = selectedQuantities[item.transaction_item_id] || 0;
    return sum + Number(item.unit_price) * qty;
  }, 0);
  const totalItemsCount = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxId) {
      toast.error("Please select a purchase transaction");
      return;
    }

    if (selectedItemsList.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        transaction_id: selectedTxId,
        reason,
        customer_notes: notes.trim() || undefined,
        items: selectedItemsList.map(item => ({
          transaction_item_id: item.transaction_item_id,
          quantity: selectedQuantities[item.transaction_item_id]
        }))
      };

      const res = await api.returns.create(payload);
      toast.success(res.message || "Return request submitted!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <RotateCcw size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">Request Product Return</h2>
              <p className="text-xs text-emerald-100">Submit an item return request for cashier review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Transaction Picker (if opened without a specific transaction) */}
          {!initialTxId && customerTransactions.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                Select Purchase Transaction
              </label>
              <select
                value={selectedTxId || ""}
                onChange={e => setSelectedTxId(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {customerTransactions.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.receipt_no} — {t.date} — {peso(Number(t.total_amount))}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Receipt Info Bar */}
          {data?.transaction && (
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block">Receipt Number</span>
                <span className="font-extrabold text-gray-800 font-mono text-sm">{data.transaction.receipt_no}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Purchase Date</span>
                <span className="font-semibold text-gray-700">{data.transaction.date}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block">Total Paid</span>
                <span className="font-extrabold text-gray-900 font-mono text-sm">{peso(Number(data.transaction.total_amount))}</span>
              </div>
            </div>
          )}

          {/* Loading / Error States */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <RotateCcw size={28} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Checking purchase items...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : data && (
            <>
              {/* Items Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Choose Items to Return
                  </label>
                  <span className="text-xs text-gray-400">
                    {selectedItemsList.length} of {data.items.length} selected
                  </span>
                </div>

                <div className="space-y-2.5">
                  {data.items.map(item => {
                    const isSelected = selectedQuantities[item.transaction_item_id] !== undefined;
                    const returnQty = selectedQuantities[item.transaction_item_id] || 1;

                    return (
                      <div
                        key={item.transaction_item_id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          !item.is_returnable
                            ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!item.is_returnable}
                              onChange={() => toggleItemSelection(item)}
                              className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-gray-900 truncate">
                                {item.product_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {peso(Number(item.unit_price))} each · Purchased: {item.purchased_quantity}
                                {item.already_returned > 0 && (
                                  <span className="text-amber-600 ml-1.5 font-medium">
                                    ({item.already_returned} already returned)
                                  </span>
                                )}
                              </p>
                            </div>
                          </label>

                          {/* Quantity Controls (if selected) */}
                          {isSelected && item.is_returnable && (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-400 font-semibold">Qty:</span>
                              <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => setItemQuantity(item, returnQty - 1)}
                                  disabled={returnQty <= 1}
                                  className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-extrabold text-gray-900 font-mono min-w-[24px] text-center">
                                  {returnQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setItemQuantity(item, returnQty + 1)}
                                  disabled={returnQty >= item.available_quantity}
                                  className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs font-extrabold text-emerald-700 font-mono min-w-[70px] text-right">
                                {peso(Number(item.unit_price) * returnQty)}
                              </span>
                            </div>
                          )}

                          {!item.is_returnable && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 shrink-0">
                              Fully Returned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Primary Reason for Return *
                  </label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {RETURN_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Additional Details / Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g., Expiration date passed, damaged packaging"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Return Policy Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
                <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Return Policy Reminder:</strong> Returned items must be brought to the cashier counter for physical verification. Once approved, refunds are completed in cash or store credit.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-left w-full sm:w-auto">
            <span className="text-xs text-gray-400 block font-semibold">Total Estimated Refund</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-600 font-mono">
                {peso(totalRefund)}
              </span>
              <span className="text-xs text-gray-500">
                ({totalItemsCount} item{totalItemsCount === 1 ? "" : "s"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedItemsList.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {submitting ? (
                <>
                  <RotateCcw size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Submit Return Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
