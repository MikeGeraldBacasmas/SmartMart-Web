import React, { useState, useEffect } from "react";
import {
  X, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, Package,
  FileText, ArrowRight, ShieldAlert, ShoppingBag, User, Search, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { api, ReturnableItem, ReturnableItemsResponse, TransactionItem } from "../../../api";

interface RequestReturnModalProps {
  transactionId?: number | null;
  customerName?: string;
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
  customerName,
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
  const [restock, setRestock] = useState<boolean>(true);
  const [decisionNotes, setDecisionNotes] = useState<string>("");
  const [itemFilter, setItemFilter] = useState<string>("");
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

  // Separate returnable items from already returned items
  const allItems = data?.items || [];
  const returnableItems = allItems.filter(i => i.is_returnable && i.available_quantity > 0);
  const alreadyReturnedItems = allItems.filter(i => !i.is_returnable || i.available_quantity <= 0);
  const isAllAlreadyReturned = data !== null && allItems.length > 0 && returnableItems.length === 0;

  const selectedItemsList = returnableItems.filter(i => selectedQuantities[i.transaction_item_id] !== undefined);
  const totalRefund = selectedItemsList.reduce((sum, item) => {
    const qty = selectedQuantities[item.transaction_item_id] || 0;
    return sum + Number(item.unit_price) * qty;
  }, 0);
  const totalItemsCount = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);

  const handleSubmitAction = async (targetStatus: "Completed" | "Rejected") => {
    if (!selectedTxId) {
      toast.error("Please select a purchase transaction");
      return;
    }

    if (selectedItemsList.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (targetStatus === "Rejected" && !decisionNotes.trim()) {
      toast.error("Please provide decision notes or a reason when rejecting a return");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        transaction_id: selectedTxId,
        reason,
        admin_notes: decisionNotes.trim() || undefined,
        status: targetStatus,
        restock: targetStatus === "Completed" ? restock : false,
        items: selectedItemsList.map(item => ({
          transaction_item_id: item.transaction_item_id,
          quantity: selectedQuantities[item.transaction_item_id]
        }))
      };

      const res = await api.returns.create(payload);
      toast.success(res.message || (targetStatus === "Rejected" ? "Return rejected successfully" : "Walk-in return approved & refund completed successfully!"));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to process walk-in return");
    } finally {
      setSubmitting(false);
    }
  };

  const displayCustomerName = customerName || data?.transaction?.customer_name;

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
              <h2 className="text-lg font-extrabold leading-tight">Process Walk-In Return</h2>
              <p className="text-xs text-emerald-100">
                {displayCustomerName ? `Customer: ${displayCustomerName} · Verify receipt and items` : "Verify customer receipt and select items to return"}
              </p>
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
                Select Purchase Transaction / Receipt
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
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs gap-3 flex-wrap">
              <div>
                <span className="text-gray-400 block">Receipt Number</span>
                <span className="font-extrabold text-gray-800 font-mono text-sm">{data.transaction.receipt_no}</span>
              </div>
              {displayCustomerName && (
                <div>
                  <span className="text-gray-400 block">Customer</span>
                  <span className="font-semibold text-gray-800">{displayCustomerName}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400 block">Cashier</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <User size={12} className="text-gray-400" />
                  {data.transaction.cashier_name || customerTransactions.find(t => t.id === selectedTxId)?.cashier || "Cashier"}
                </span>
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
              <p className="text-sm font-medium">Loading receipt items...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : data && (
            <>
              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    {isAllAlreadyReturned ? "Transaction Items Status" : "Select Items to Return"}
                  </label>
                  {!isAllAlreadyReturned && (
                    <span className="text-xs text-gray-400">
                      {selectedItemsList.length} of {returnableItems.length} returnable selected
                    </span>
                  )}
                </div>

                {/* Case 1: All items are already returned */}
                {isAllAlreadyReturned ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-extrabold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                          Already Returned
                        </p>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          All items on this receipt have already been returned. The return button is no longer needed as there are no returnable items remaining.
                        </p>
                      </div>
                    </div>

                    {/* Non-selectable list of already returned items */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-gray-50/50">
                      {alreadyReturnedItems.map(item => (
                        <div key={item.transaction_item_id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-bold text-gray-700">{item.product_name}</p>
                            <p className="text-gray-400 mt-0.5">
                              Purchased: {item.purchased_quantity} · {peso(Number(item.unit_price))} each
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-gray-200/80 text-gray-600 font-bold text-[11px] border border-gray-300 flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={12} className="text-gray-500" /> Already Returned
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Case 2: There are returnable items */
                  <>
                    {/* Notice for any already returned items that are excluded */}
                    {alreadyReturnedItems.length > 0 && (
                      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-gray-600">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>
                            <strong className="text-gray-800">Already Returned:</strong>{" "}
                            {alreadyReturnedItems.map(i => `${i.product_name} (×${i.already_returned || i.purchased_quantity})`).join(", ")}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-md shrink-0 self-start sm:self-auto">
                          Already Returned · Excluded
                        </span>
                      </div>
                    )}

                    {returnableItems.length > 3 && (
                      <div className="relative mb-2.5">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={itemFilter}
                          onChange={e => setItemFilter(e.target.value)}
                          placeholder="Filter eligible items on this receipt..."
                          className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        {itemFilter && (
                          <button
                            type="button"
                            onClick={() => setItemFilter("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {returnableItems
                        .filter(item => !itemFilter.trim() || item.product_name.toLowerCase().includes(itemFilter.toLowerCase().trim()))
                        .map(item => {
                          const isSelected = selectedQuantities[item.transaction_item_id] !== undefined;
                          const returnQty = selectedQuantities[item.transaction_item_id] || 1;

                          return (
                            <div
                              key={item.transaction_item_id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isSelected
                                  ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                                  : "bg-white border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(item)}
                                    className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-extrabold text-gray-900 truncate">
                                      {item.product_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {peso(Number(item.unit_price))} each
                                      {item.current_stock !== undefined && (
                                        <span className="text-gray-400 font-mono ml-1.5">
                                          (Current store stock: {item.current_stock})
                                        </span>
                                      )}
                                      {" "}· Eligible to return: <span className="font-bold text-gray-700">{item.available_quantity}</span> of {item.purchased_quantity}
                                      {item.already_returned > 0 && (
                                        <span className="text-amber-600 ml-1.5 font-medium">
                                          ({item.already_returned} already returned)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </label>

                                {/* Quantity Controls (if selected) */}
                                {isSelected && (
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
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>

              {/* Reason & Notes (only needed when there are returnable items) */}
              {!isAllAlreadyReturned && (
                <>
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

                  {/* Restock Option */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restock}
                        onChange={e => setRestock(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-800">Restock item(s) back into store inventory</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Automatically increment the products' stock counts upon approval</p>
                      </div>
                    </label>
                  </div>

                  {/* Store Decision Notes / Feedback */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                      Store Decision Notes / Feedback
                    </label>
                    <textarea
                      rows={2}
                      value={decisionNotes}
                      onChange={e => setDecisionNotes(e.target.value)}
                      placeholder="e.g., Items inspected at counter; refund paid in cash."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Return Policy Notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Walk-In Verification Notice:</strong> Verify the physical condition of the item and match against the receipt. Choose <strong>Approve &amp; Complete Refund</strong> to immediately finalize the refund and restock inventory, or <strong>Reject Return</strong> if ineligible.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-left w-full sm:w-auto">
            {!isAllAlreadyReturned ? (
              <>
                <span className="text-xs text-gray-400 block font-semibold">Total Estimated Refund</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-emerald-600 font-mono">
                    {peso(totalRefund)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({totalItemsCount} item{totalItemsCount === 1 ? "" : "s"})
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-gray-200/80 text-gray-700 font-bold text-xs flex items-center gap-1.5 border border-gray-300">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Already Returned
                </span>
                <span className="text-xs text-gray-500">Return button is no longer needed</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isAllAlreadyReturned ? "Close" : "Cancel"}
            </button>
            {/* The return buttons are no longer needed when all items are already returned */}
            {!isAllAlreadyReturned && (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmitAction("Rejected")}
                  disabled={submitting || selectedItemsList.length === 0}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  {submitting ? (
                    <RotateCcw size={15} className="animate-spin" />
                  ) : (
                    <XCircle size={15} />
                  )}
                  Reject Return
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitAction("Completed")}
                  disabled={submitting || selectedItemsList.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {submitting ? (
                    <>
                      <RotateCcw size={16} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Approve & Complete Refund
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
