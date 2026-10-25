import React, { useState, useEffect } from "react";
import {
  X, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, Package,
  FileText, ArrowRight, ShieldAlert, ShoppingBag, User, Search, XCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import { api, ReturnableItem, ReturnableItemsResponse, TransactionItem, notifyStockOrDataChanged } from "../../../api";

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
  const [submittingAction, setSubmittingAction] = useState<"Completed" | "Rejected" | null>(null);

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
          // Automatically select the first returnable item with qty 1 for convenience (if not expired)
          if (!res.transaction.is_return_window_expired) {
            const firstReturnable = res.items.find(i => i.is_returnable);
            if (firstReturnable) {
              setSelectedQuantities({ [firstReturnable.transaction_item_id]: 1 });
            }
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
    if (!item.is_returnable || data?.transaction?.is_return_window_expired) return;
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

  // Separate returnable items from already returned items & expired state
  const isWindowExpired = Boolean(data?.transaction?.is_return_window_expired);
  const allItems = data?.items || [];
  const returnableItems = isWindowExpired
    ? []
    : allItems.filter(i => i.is_returnable && i.available_quantity > 0);
  const alreadyReturnedItems = allItems.filter(i => (i.already_returned || 0) > 0);
  const isAllAlreadyReturned = !isWindowExpired && data !== null && allItems.length > 0 && allItems.every(i => (i.already_returned || 0) >= i.purchased_quantity);

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

    setSubmittingAction(targetStatus);
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
      notifyStockOrDataChanged();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to process walk-in return");
    } finally {
      setSubmittingAction(null);
    }
  };

  const displayCustomerName = customerName || data?.transaction?.customer_name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-foreground">
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
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Transaction Picker (if opened without a specific transaction) */}
          {!initialTxId && customerTransactions.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Select Purchase Transaction / Receipt
              </label>
              <select
                value={selectedTxId || ""}
                onChange={e => setSelectedTxId(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/60 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs gap-3 flex-wrap">
                <div>
                  <span className="text-muted-foreground block">Receipt Number</span>
                  <span className="font-extrabold text-foreground font-mono text-sm">{data.transaction.receipt_no}</span>
                </div>
                {displayCustomerName && (
                  <div>
                    <span className="text-muted-foreground block">Customer</span>
                    <span className="font-semibold text-foreground">{displayCustomerName}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground block">Cashier</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <User size={12} className="text-muted-foreground" />
                    {data.transaction.cashier_name || customerTransactions.find(t => t.id === selectedTxId)?.cashier || "Cashier"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Purchase Date</span>
                  <span className="font-semibold text-foreground">{data.transaction.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block">Total Paid</span>
                  <span className="font-extrabold text-foreground font-mono text-sm">{peso(Number(data.transaction.total_amount))}</span>
                </div>
              </div>

              {isWindowExpired && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground flex items-start gap-3">
                  <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Return Period Ended
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Items can only be returned within 24 hours of purchase.
                    </p>
                  </div>
                </div>
              )}
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
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isWindowExpired
                      ? "Receipt Items (Non-Returnable)"
                      : isAllAlreadyReturned
                        ? "Transaction Items Status"
                        : "Select Items to Return"}
                  </label>
                  {!isWindowExpired && !isAllAlreadyReturned && (
                    <span className="text-xs text-muted-foreground">
                      {selectedItemsList.length} of {returnableItems.length} returnable selected
                    </span>
                  )}
                </div>

                {/* Case 0: Return window expired (> 24 hours) */}
                {isWindowExpired ? (
                  <div className="space-y-3">
                    <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-muted/40">
                      {allItems.map(item => (
                        <div key={item.transaction_item_id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-bold text-foreground">{item.product_name}</p>
                            <p className="text-muted-foreground mt-0.5">
                              Purchased: {item.purchased_quantity} · {peso(Number(item.unit_price))} each
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium text-[11px] border border-border flex items-center gap-1 shrink-0">
                            <Clock size={12} className="text-muted-foreground" /> Non-returnable
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : isAllAlreadyReturned ? (
                  /* Case 1: All items are already returned */
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                          Already Returned
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          All items on this receipt have already been returned. The return button is no longer needed as there are no returnable items remaining.
                        </p>
                      </div>
                    </div>

                    {/* Non-selectable list of already returned items */}
                    <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-muted/40">
                      {alreadyReturnedItems.map(item => (
                        <div key={item.transaction_item_id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-bold text-foreground">{item.product_name}</p>
                            <p className="text-muted-foreground mt-0.5">
                              Purchased: {item.purchased_quantity} · {peso(Number(item.unit_price))} each
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-bold text-[11px] border border-border flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={12} className="text-muted-foreground" /> Already Returned
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
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-foreground">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <span>
                            <strong className="text-foreground">Already Returned:</strong>{" "}
                            {alreadyReturnedItems.map(i => `${i.product_name} (×${i.already_returned || i.purchased_quantity})`).join(", ")}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0 self-start sm:self-auto border border-border">
                          Already Returned · Excluded
                        </span>
                      </div>
                    )}

                    {returnableItems.length > 3 && (
                      <div className="relative mb-2.5">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={itemFilter}
                          onChange={e => setItemFilter(e.target.value)}
                          placeholder="Filter eligible items on this receipt..."
                          className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-muted/60 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        {itemFilter && (
                          <button
                            type="button"
                            onClick={() => setItemFilter("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors"
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
                                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                                  : "bg-card border-border hover:border-border/80"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(item)}
                                    className="w-4 h-4 rounded text-emerald-600 border-border focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-extrabold text-foreground truncate">
                                      {item.product_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {peso(Number(item.unit_price))} each
                                      {item.current_stock !== undefined && (
                                        <span className="text-muted-foreground font-mono ml-1.5">
                                          (Current store stock: {item.current_stock})
                                        </span>
                                      )}
                                      {" "}· Eligible to return: <span className="font-bold text-foreground">{item.available_quantity}</span> of {item.purchased_quantity}
                                      {item.already_returned > 0 && (
                                        <span className="text-amber-500 ml-1.5 font-medium">
                                          ({item.already_returned} already returned)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </label>

                                {/* Quantity Controls (if selected) */}
                                {isSelected && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground font-semibold">Qty:</span>
                                    <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden shadow-xs">
                                      <button
                                        type="button"
                                        onClick={() => setItemQuantity(item, returnQty - 1)}
                                        disabled={returnQty <= 1}
                                        className="px-2.5 py-1 text-foreground hover:bg-muted disabled:opacity-30 text-xs font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="px-2 text-xs font-extrabold text-foreground font-mono min-w-[24px] text-center">
                                        {returnQty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setItemQuantity(item, returnQty + 1)}
                                        disabled={returnQty >= item.available_quantity}
                                        className="px-2.5 py-1 text-foreground hover:bg-muted disabled:opacity-30 text-xs font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-xs font-extrabold text-emerald-500 font-mono min-w-[70px] text-right">
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Primary Reason for Return *
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/60 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {RETURN_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Restock Option */}
                  <div className="p-3.5 rounded-2xl border border-border bg-card">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restock}
                        onChange={e => setRestock(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-border focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground">Restock item(s) back into store inventory</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Automatically increment the products' stock counts upon approval</p>
                      </div>
                    </label>
                  </div>

                  {/* Store Decision Notes / Feedback */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Store Decision Notes / Feedback
                    </label>
                    <textarea
                      rows={2}
                      value={decisionNotes}
                      onChange={e => setDecisionNotes(e.target.value)}
                      placeholder="e.g., Items inspected at counter; refund paid in cash."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none placeholder-muted-foreground"
                    />
                  </div>

                  {/* Return Policy Notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      <strong>Walk-In Verification Notice:</strong> Verify the physical condition of the item and match against the receipt. Choose <strong>Approve &amp; Complete Refund</strong> to immediately finalize the refund and restock inventory, or <strong>Reject Return</strong> if ineligible.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-left">
            {isWindowExpired ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-semibold text-xs flex items-center gap-1.5 border border-border">
                  <Clock size={14} className="text-muted-foreground" /> Return Period Ended
                </span>
                <span className="text-xs text-muted-foreground">Past 24-hour return policy</span>
              </div>
            ) : !isAllAlreadyReturned ? (
              <>
                <span className="text-[11px] text-muted-foreground block font-semibold uppercase tracking-wider">Total Estimated Refund</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-emerald-500 font-mono">
                    {peso(totalRefund)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    ({totalItemsCount} item{totalItemsCount === 1 ? "" : "s"})
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground font-bold text-xs flex items-center gap-1.5 border border-border">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Already Returned
                </span>
                <span className="text-xs text-muted-foreground">Return button is no longer needed</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer whitespace-nowrap"
            >
              {isWindowExpired || isAllAlreadyReturned ? "Close" : "Cancel"}
            </button>
            {!isWindowExpired && !isAllAlreadyReturned && (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmitAction("Rejected")}
                  disabled={submittingAction !== null || selectedItemsList.length === 0}
                  className="h-9 px-3.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {submittingAction === "Rejected" ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" /> Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle size={14} /> Reject Return
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitAction("Completed")}
                  disabled={submittingAction !== null || selectedItemsList.length === 0}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  {submittingAction === "Completed" ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Approve & Complete Refund
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
