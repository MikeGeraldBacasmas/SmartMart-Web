import React, { useState, useEffect, useMemo } from "react";
import {
  X, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, Package,
  FileText, ArrowRight, ShieldAlert, ShoppingBag, User, Search, XCircle, Clock,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  ReturnableItem,
  ReturnableItemsResponse,
  TransactionItem,
  ProductItem,
  CreateReturnPayload,
  notifyStockOrDataChanged
} from "../../../api";

interface RequestReturnModalProps {
  transactionId?: number | null;
  customerName?: string;
  onClose: () => void;
  onSuccess: () => void;
  customerTransactions?: TransactionItem[];
  availableProducts?: ProductItem[];
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
  customerTransactions = [],
  availableProducts
}: RequestReturnModalProps) {
  const [selectedTxId, setSelectedTxId] = useState<number | null>(initialTxId || null);
  const [data, setData] = useState<ReturnableItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transactions list for receipt lookup
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>(customerTransactions);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState("");

  // Selected items to return: map of transaction_item_id -> return quantity
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [restock, setRestock] = useState<boolean>(true);
  const [decisionNotes, setDecisionNotes] = useState<string>("");
  const [itemFilter, setItemFilter] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<"Completed" | "Rejected" | null>(null);

  // POS Store Products for replacement selection
  const [storeProducts, setStoreProducts] = useState<ProductItem[]>(availableProducts || []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [posCategory, setPosCategory] = useState("All");
  const [selectedReplacementProduct, setSelectedReplacementProduct] = useState<ProductItem | null>(null);
  const [replacementQty, setReplacementQty] = useState<number>(1);
  const [cashTendered, setCashTendered] = useState<string>("");

  // Load store products if not passed via props
  useEffect(() => {
    if (availableProducts && availableProducts.length > 0) {
      setStoreProducts(availableProducts);
      return;
    }
    setLoadingProducts(true);
    api.products.getAll()
      .then(prods => setStoreProducts(prods || []))
      .catch(err => console.error("Failed to load POS products:", err))
      .finally(() => setLoadingProducts(false));
  }, [availableProducts]);

  // Load recent transactions if not passed
  useEffect(() => {
    if (customerTransactions && customerTransactions.length > 0) {
      setRecentTransactions(customerTransactions);
      if (!selectedTxId && !initialTxId) {
        setSelectedTxId(customerTransactions[0].id);
      }
      return;
    }

    api.transactions.getAll()
      .then(txs => {
        setRecentTransactions(txs || []);
        if (!selectedTxId && !initialTxId && txs && txs.length > 0) {
          setSelectedTxId(txs[0].id);
        }
      })
      .catch(err => console.error("Failed to load transactions for return:", err));
  }, [customerTransactions, initialTxId, selectedTxId]);

  // Categories from store products
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    storeProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [storeProducts]);

  // Fetch returnable items whenever selectedTxId changes
  useEffect(() => {
    if (!selectedTxId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setSelectedQuantities({});
    setSelectedReplacementProduct(null);
    setCashTendered("");

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

  // Auto-suggest default replacement product (exact match or first eligible)
  useEffect(() => {
    if (!selectedReplacementProduct && selectedItemsList.length > 0 && storeProducts.length > 0) {
      const firstReturned = selectedItemsList[0];
      // Try exact same product first if price >= totalRefund
      const same = storeProducts.find(p => p.id === firstReturned.product_id && Number(p.price) >= totalRefund && p.stock > 0);
      if (same) {
        setSelectedReplacementProduct(same);
      } else {
        const eligible = storeProducts.find(p => Number(p.price) >= totalRefund && p.stock > 0);
        if (eligible) {
          setSelectedReplacementProduct(eligible);
        }
      }
    }
  }, [selectedItemsList, storeProducts, totalRefund, selectedReplacementProduct]);

  // Calculations for replacement pricing & customer cash addition
  const replacementUnitPrice = selectedReplacementProduct ? Number(selectedReplacementProduct.price) : 0;
  const replacementTotal = replacementUnitPrice * replacementQty;
  const additionalCashRequired = Math.max(0, replacementTotal - totalRefund);
  const cashGiven = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashGiven - additionalCashRequired);
  const isCashInsufficient = additionalCashRequired > 0 && cashGiven < additionalCashRequired;

  // Filter products in POS replacement picker
  const filteredReplacementProducts = useMemo(() => {
    return storeProducts.filter(p => {
      const q = posSearch.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(q) ||
                            (p.category && p.category.toLowerCase().includes(q));
      const matchesCategory = posCategory === "All" || p.category === posCategory;
      return matchesSearch && matchesCategory && p.stock > 0;
    });
  }, [storeProducts, posSearch, posCategory]);

  // Filter transactions for receipt lookup
  const filteredTransactions = useMemo(() => {
    if (!receiptSearchQuery.trim()) return recentTransactions;
    const q = receiptSearchQuery.toLowerCase();
    return recentTransactions.filter(t =>
      (t.receipt_no && t.receipt_no.toLowerCase().includes(q)) ||
      (t.customer && t.customer.toLowerCase().includes(q)) ||
      ((t as any).customer_name && (t as any).customer_name.toLowerCase().includes(q))
    );
  }, [recentTransactions, receiptSearchQuery]);

  const handleSubmitAction = async (targetStatus: "Completed" | "Rejected") => {
    if (!selectedTxId) {
      toast.error("Please select a purchase transaction");
      return;
    }

    if (selectedItemsList.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (targetStatus === "Rejected") {
      if (!decisionNotes.trim()) {
        toast.error("Please provide decision notes or a reason when rejecting a return");
        return;
      }
    } else {
      // Validate replacement item for Completed status
      if (!selectedReplacementProduct) {
        toast.error(`Please select a replacement item from the POS catalog (minimum value: ${peso(totalRefund)})`);
        return;
      }

      if (replacementTotal < totalRefund) {
        toast.error(`Replacement item price (${peso(replacementTotal)}) cannot be lower than the return credit (${peso(totalRefund)}). Customer must pick an item worth at least ${peso(totalRefund)}.`);
        return;
      }

      if (additionalCashRequired > 0 && cashGiven < additionalCashRequired) {
        toast.error(`Customer has not tendered enough cash. Short by ${peso(additionalCashRequired - cashGiven)}.`);
        return;
      }
    }

    setSubmittingAction(targetStatus);
    try {
      const payload: CreateReturnPayload = {
        transaction_id: selectedTxId,
        reason,
        admin_notes: decisionNotes.trim() || undefined,
        status: targetStatus,
        restock: targetStatus === "Completed" ? restock : false,
        items: selectedItemsList.map(item => ({
          transaction_item_id: item.transaction_item_id,
          quantity: selectedQuantities[item.transaction_item_id]
        })),
        replacement_item: (targetStatus === "Completed" && selectedReplacementProduct) ? {
          product_id: selectedReplacementProduct.id,
          product_name: selectedReplacementProduct.name,
          quantity: replacementQty,
          unit_price: replacementUnitPrice,
          additional_amount_paid: additionalCashRequired
        } : undefined
      };

      const res = await api.returns.create(payload);
      toast.success(res.message || (targetStatus === "Rejected" ? "Return rejected successfully" : "Walk-in return approved & item replacement completed successfully!"));
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
      <div className="relative w-full max-w-3xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-foreground">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <RotateCcw size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">Process Walk-In Return &amp; Replacement</h2>
              <p className="text-xs text-emerald-100">
                {displayCustomerName ? `Customer: ${displayCustomerName} · Choose replacement item for customer` : "Verify customer receipt and choose replacement item from store inventory"}
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
          {/* Transaction Picker & Search */}
          {!initialTxId && (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-500" /> Select Customer Purchase Receipt
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {filteredTransactions.length} receipt(s) available
                </span>
              </div>

              {recentTransactions.length > 5 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={receiptSearchQuery}
                    onChange={e => setReceiptSearchQuery(e.target.value)}
                    placeholder="Search receipt number (e.g. TRX-2026-0001)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              <select
                value={selectedTxId || ""}
                onChange={e => setSelectedTxId(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {filteredTransactions.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.receipt_no} — {t.date} — {peso(Number(t.total_amount))} {t.customer ? `(${t.customer})` : ""}
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
                    {data.transaction.cashier_name || recentTransactions.find(t => t.id === selectedTxId)?.cashier || "Cashier"}
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
              {/* ─── Step 1: Select Items Being Returned ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isWindowExpired
                      ? "Receipt Items (Non-Returnable)"
                      : isAllAlreadyReturned
                        ? "Transaction Items Status"
                        : "1. Select Item(s) Being Returned by Customer"}
                  </label>
                  {!isWindowExpired && !isAllAlreadyReturned && (
                    <span className="text-xs text-muted-foreground">
                      {selectedItemsList.length} of {returnableItems.length} returnable selected
                    </span>
                  )}
                </div>

                {isWindowExpired ? (
                  <div className="space-y-3">
                    <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-muted/40">
                      {allItems.map(item => (
                        <div key={item.transaction_item_id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-extrabold text-foreground text-sm">{item.product_name}</p>
                            <p className="text-muted-foreground mt-0.5">
                              {item.purchased_quantity} unit(s) purchased @ {peso(Number(item.unit_price))}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                            Expired
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : isAllAlreadyReturned ? (
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border text-center space-y-1">
                    <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-foreground">All items from this receipt have already been returned / replaced</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-card">
                    {returnableItems.map(item => {
                      const isSelected = selectedQuantities[item.transaction_item_id] !== undefined;
                      const currentQty = selectedQuantities[item.transaction_item_id] || 1;

                      return (
                        <div
                          key={item.transaction_item_id}
                          className={`p-4 transition-colors ${isSelected ? "bg-emerald-500/5" : "hover:bg-muted/40"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(item)}
                                className="w-4 h-4 mt-1 rounded text-emerald-600 border-border focus:ring-emerald-500 cursor-pointer"
                              />
                              <div>
                                <p className="font-extrabold text-foreground text-sm">{item.product_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Purchased: {item.purchased_quantity} unit(s) @ {peso(Number(item.unit_price))} · Returnable: {item.available_quantity}
                                </p>
                              </div>
                            </label>

                            {isSelected && (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground font-semibold">Qty:</span>
                                <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => setItemQuantity(item, currentQty - 1)}
                                    disabled={currentQty <= 1}
                                    className="px-2.5 py-1 text-xs font-extrabold text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="px-3 py-1 text-xs font-mono font-extrabold text-foreground">
                                    {currentQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setItemQuantity(item, currentQty + 1)}
                                    disabled={currentQty >= item.available_quantity}
                                    className="px-2.5 py-1 text-xs font-extrabold text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-sm font-extrabold font-mono text-emerald-500 ml-1">
                                  {peso(Number(item.unit_price) * currentQty)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── Step 2: Choose Replacement Item in POS Catalog ─── */}
              {!isWindowExpired && !isAllAlreadyReturned && selectedItemsList.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-emerald-500" /> 2. Choose Replacement Item for Customer (POS Catalog)
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customer return credit limit: <strong className="text-emerald-500 font-mono">{peso(totalRefund)}</strong>. Customer can pick any item valued at <strong className="text-foreground">{peso(totalRefund)} or higher</strong>. If higher, customer adds money.
                      </p>
                    </div>
                    {selectedReplacementProduct && (
                      <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                        ✓ {selectedReplacementProduct.name}
                      </span>
                    )}
                  </div>

                  {/* Search and Categories */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={posSearch}
                        onChange={e => setPosSearch(e.target.value)}
                        placeholder="Search POS products by name or category..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                      {productCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPosCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            posCategory === cat
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Products Selection Grid */}
                  {loadingProducts ? (
                    <div className="py-8 flex justify-center text-muted-foreground">
                      <RotateCcw size={20} className="animate-spin text-emerald-500" />
                    </div>
                  ) : filteredReplacementProducts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border text-center text-xs text-muted-foreground">
                      No matching products found in POS inventory.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 border border-border rounded-2xl bg-card">
                      {filteredReplacementProducts.map(prod => {
                        const prodPrice = Number(prod.price);
                        const isEligible = prodPrice >= totalRefund;
                        const isSelected = selectedReplacementProduct?.id === prod.id;
                        const diff = prodPrice - totalRefund;

                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              if (isEligible) {
                                setSelectedReplacementProduct(prod);
                                setCashTendered("");
                              } else {
                                toast.error(`"${prod.name}" costs ${peso(prodPrice)}, which is below the return credit (${peso(totalRefund)}). The customer must pick an item worth at least ${peso(totalRefund)}.`);
                              }
                            }}
                            className={`p-3 rounded-xl border text-xs transition-all relative cursor-pointer ${
                              !isEligible
                                ? "opacity-45 bg-muted/30 border-border/60 cursor-not-allowed"
                                : isSelected
                                ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-xs"
                                : "border-border hover:border-emerald-500/50 hover:bg-muted/40 bg-card"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-foreground text-xs truncate" title={prod.name}>
                                  {prod.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {prod.category} • {prod.stock} in stock
                                </p>
                              </div>
                              <span className="font-extrabold text-foreground font-mono shrink-0">
                                {peso(prodPrice)}
                              </span>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between text-[10px]">
                              {!isEligible ? (
                                <span className="text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                  Below Min ({peso(totalRefund)})
                                </span>
                              ) : diff === 0 ? (
                                <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  Exact Match (₱0.00 add)
                                </span>
                              ) : (
                                <span className="text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                  +{peso(diff)} Customer Adds
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-emerald-500 font-extrabold flex items-center gap-0.5">
                                  <CheckCircle2 size={12} /> Picked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Replacement Calculation & Additional Payment Card */}
                  {selectedReplacementProduct && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      additionalCashRequired > 0
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-100"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider block">
                            Replacement Item Chosen
                          </span>
                          <p className="text-sm font-extrabold text-foreground mt-0.5">
                            {replacementQty}× {selectedReplacementProduct.name} ({peso(replacementUnitPrice)})
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-muted-foreground block">Customer Return Credit</span>
                          <span className="font-extrabold font-mono text-emerald-500 text-sm">
                            −{peso(totalRefund)}
                          </span>
                        </div>
                      </div>

                      {additionalCashRequired === 0 ? (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={16} /> Exact Price Match
                          </span>
                          <span>Additional cash to pay: ₱0.00 (Even Exchange)</span>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                              <AlertTriangle size={15} className="text-purple-500 shrink-0" />
                              <span>Customer chose higher-value item ({selectedReplacementProduct.name}):</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Customer Must Add Money</span>
                              <span className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                                +{peso(additionalCashRequired)}
                              </span>
                            </div>
                          </div>

                          {/* Cash Tendered Input */}
                          <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <label className="text-xs font-bold text-foreground">
                                Cash Tendered by Customer (₱):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  min={additionalCashRequired}
                                  value={cashTendered}
                                  onChange={e => setCashTendered(e.target.value)}
                                  placeholder={`Min ${additionalCashRequired.toFixed(2)}`}
                                  className="w-32 px-3 py-1.5 text-right font-mono font-extrabold text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCashTendered(additionalCashRequired.toString())}
                                  className="px-2 py-1 text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors cursor-pointer"
                                >
                                  Exact
                                </button>
                              </div>
                            </div>

                            {/* Quick money shortcuts */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {[50, 100, 200, 500, 1000].map(amt => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setCashTendered(amt.toString())}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md cursor-pointer"
                                >
                                  ₱{amt}
                                </button>
                              ))}
                            </div>

                            {/* Change calculation */}
                            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">Customer Change:</span>
                              <span className={`font-mono font-extrabold ${isCashInsufficient ? "text-red-500" : "text-emerald-500"}`}>
                                {isCashInsufficient ? (
                                  `Insufficient (Short by ${peso(additionalCashRequired - cashGiven)})`
                                ) : (
                                  peso(changeDue)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Reason, Restock, Notes ─── */}
              {!isWindowExpired && !isAllAlreadyReturned && selectedItemsList.length > 0 && (
                <>
                  <div className="pt-2 border-t border-border">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Reason for Return
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

                  {/* Restock Condition */}
                  <div className="p-3.5 rounded-2xl border border-border bg-card">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restock}
                        onChange={e => setRestock(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-border focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground">Returned item is unopened / resellable condition (Restock)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Check if the returned unit can be placed back into store stock. Leave unchecked if damaged, defective, or spoiled.</p>
                      </div>
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Staff / Store Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={decisionNotes}
                      onChange={e => setDecisionNotes(e.target.value)}
                      placeholder="e.g., Replacement item handed to customer. Additional cash collected."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none placeholder-muted-foreground"
                    />
                  </div>

                  {/* Policy reminder */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      <strong>Store Replacement Policy:</strong> The customer's return credit is limited to the value of the returned item ({peso(totalRefund)}). When choosing a replacement item valued at {peso(totalRefund)}+, collect the additional cash difference from the customer before issuing the replacement.
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
            ) : !isAllAlreadyReturned && selectedItemsList.length > 0 ? (
              <>
                <span className="text-[11px] text-muted-foreground block font-semibold uppercase tracking-wider">
                  Replacement Value Summary
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-extrabold text-emerald-500 font-mono">
                    {peso(selectedReplacementProduct ? replacementTotal : totalRefund)}
                  </span>
                  {additionalCashRequired > 0 && (
                    <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      +{peso(additionalCashRequired)} Added by Customer
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                  Return Credit: {peso(totalRefund)} • {selectedReplacementProduct ? `Replaced with: ${selectedReplacementProduct.name}` : "Select a replacement product"}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground font-bold text-xs flex items-center gap-1.5 border border-border">
                  <CheckCircle2 size={14} className="text-emerald-500" /> No Action Needed
                </span>
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
            {!isWindowExpired && !isAllAlreadyReturned && selectedItemsList.length > 0 && (
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
                  disabled={
                    submittingAction !== null ||
                    selectedItemsList.length === 0 ||
                    !selectedReplacementProduct ||
                    replacementTotal < totalRefund ||
                    isCashInsufficient
                  }
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  {submittingAction === "Completed" ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Approve &amp; Issue Replacement
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
