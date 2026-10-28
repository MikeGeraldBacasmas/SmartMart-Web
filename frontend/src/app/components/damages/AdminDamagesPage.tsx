import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Download,
  Check,
  X,
  User,
  Package,
  FileText,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { api, DamageIncident } from "../../../api";

const peso = (val: number | string) =>
  `₱${Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminDamagesPage() {
  const [damages, setDamages] = useState<DamageIncident[]>(() => {
    try {
      const cached = localStorage.getItem("smartmart_damage_incidents");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [selectedIncident, setSelectedIncident] = useState<DamageIncident | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Mark damages as viewed when entering page
  const markAsViewed = useCallback(() => {
    try {
      localStorage.setItem("smartmart_viewed_damages_time", String(Date.now() + 1000));
      window.dispatchEvent(new CustomEvent("smartmart:refresh-data"));
    } catch {}
  }, []);

  const fetchDamages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.damages.getAll();
      if (Array.isArray(res)) {
        setDamages(res);
        try {
          localStorage.setItem("smartmart_damage_incidents", JSON.stringify(res));
        } catch {}
      }
    } catch (err) {
      console.warn("Could not fetch damages via API, using cached data:", err);
      try {
        const cached = localStorage.getItem("smartmart_damage_incidents");
        if (cached) setDamages(JSON.parse(cached));
      } catch {}
    } finally {
      setIsLoading(false);
      markAsViewed();
    }
  }, [markAsViewed]);

  useEffect(() => {
    fetchDamages();
    markAsViewed();
    const handleSync = () => fetchDamages();
    window.addEventListener("smartmart:refresh-data", handleSync);
    return () => window.removeEventListener("smartmart:refresh-data", handleSync);
  }, [fetchDamages, markAsViewed]);

  // Update consequence status (The Process)
  const handleUpdateStatus = async (incidentId: number, newStatus: string) => {
    setUpdatingId(incidentId);
    try {
      await api.damages.updateStatus(incidentId, { consequence_status: newStatus });
    } catch (err) {
      console.warn("Failed API status update, persisting locally:", err);
    }

    const updated = damages.map(d =>
      d.id === incidentId ? { ...d, consequence_status: newStatus } : d
    );
    setDamages(updated);
    try {
      localStorage.setItem("smartmart_damage_incidents", JSON.stringify(updated));
    } catch {}

    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident({ ...selectedIncident, consequence_status: newStatus });
    }

    setUpdatingId(null);
    markAsViewed();
    toast.success(`Incident consequence set to: "${newStatus}"`);
  };

  // Batch confirm all pending
  const handleBatchConfirmPending = async () => {
    const pendingList = damages.filter(
      d => !d.consequence_status || d.consequence_status === "Pending Payroll Deduction"
    );
    if (pendingList.length === 0) {
      toast.info("No pending damage consequences to process.");
      return;
    }

    const updated = damages.map(d =>
      !d.consequence_status || d.consequence_status === "Pending Payroll Deduction"
        ? { ...d, consequence_status: "Deducted from Salary" }
        : d
    );

    setDamages(updated);
    try {
      localStorage.setItem("smartmart_damage_incidents", JSON.stringify(updated));
    } catch {}

    // Send API updates in parallel
    Promise.all(
      pendingList.map(d =>
        api.damages.updateStatus(d.id, { consequence_status: "Deducted from Salary" }).catch(() => {})
      )
    );

    markAsViewed();
    toast.success(`Processed & confirmed salary deductions for ${pendingList.length} incident(s).`);
  };

  // Staff list for filter
  const uniqueStaff = useMemo(() => {
    const names = new Set(damages.map(d => d.staff_name).filter(Boolean));
    return Array.from(names);
  }, [damages]);

  // Filtered damages
  const filtered = useMemo(() => {
    return damages.filter(d => {
      const matchSearch =
        d.incident_no.toLowerCase().includes(search.toLowerCase()) ||
        d.product_name.toLowerCase().includes(search.toLowerCase()) ||
        d.staff_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.notes && d.notes.toLowerCase().includes(search.toLowerCase())) ||
        d.reason.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Pending" &&
          (!d.consequence_status || d.consequence_status === "Pending Payroll Deduction")) ||
        d.consequence_status === statusFilter;

      const matchStaff = staffFilter === "All" || d.staff_name === staffFilter;

      return matchSearch && matchStatus && matchStaff;
    });
  }, [damages, search, statusFilter, staffFilter]);

  // Metrics
  const totalIncidents = damages.length;
  const totalUnits = damages.reduce((acc, d) => acc + Number(d.quantity || 0), 0);
  const totalCost = damages.reduce((acc, d) => acc + Number(d.total_cost || 0), 0);

  const pendingList = damages.filter(
    d => !d.consequence_status || d.consequence_status === "Pending Payroll Deduction"
  );
  const pendingCost = pendingList.reduce((acc, d) => acc + Number(d.total_cost || 0), 0);

  const settledList = damages.filter(d => d.consequence_status === "Deducted from Salary");
  const settledCost = settledList.reduce((acc, d) => acc + Number(d.total_cost || 0), 0);

  const waivedList = damages.filter(d => d.consequence_status === "Waived - Store Loss");
  const waivedCost = waivedList.reduce((acc, d) => acc + Number(d.total_cost || 0), 0);

  // Grouped by staff
  const staffSummary = useMemo(() => {
    const map: Record<string, { totalIncidents: number; totalUnits: number; totalCost: number; pendingCost: number; settledCost: number }> = {};
    damages.forEach(d => {
      const s = d.staff_name || "Unassigned";
      if (!map[s]) {
        map[s] = { totalIncidents: 0, totalUnits: 0, totalCost: 0, pendingCost: 0, settledCost: 0 };
      }
      map[s].totalIncidents += 1;
      map[s].totalUnits += Number(d.quantity || 0);
      map[s].totalCost += Number(d.total_cost || 0);
      if (!d.consequence_status || d.consequence_status === "Pending Payroll Deduction") {
        map[s].pendingCost += Number(d.total_cost || 0);
      } else if (d.consequence_status === "Deducted from Salary") {
        map[s].settledCost += Number(d.total_cost || 0);
      }
    });
    return map;
  }, [damages]);

  // CSV Export
  const exportCSV = () => {
    if (damages.length === 0) {
      toast.error("No damage incidents to export.");
      return;
    }
    const headers = [
      "Incident Number",
      "Date",
      "Product Name",
      "Category",
      "Accountable Staff",
      "Quantity Damaged",
      "Unit Cost",
      "Total Penalty Cost",
      "Reason / Cause",
      "Notes",
      "Consequence Status"
    ];

    const rows = damages.map(d => [
      `"${d.incident_no}"`,
      `"${d.created_at}"`,
      `"${d.product_name.replace(/"/g, '""')}"`,
      `"${d.category || ""}"`,
      `"${d.staff_name}"`,
      d.quantity,
      d.unit_cost,
      d.total_cost,
      `"${d.reason.replace(/"/g, '""')}"`,
      `"${(d.notes || "").replace(/"/g, '""')}"`,
      `"${d.consequence_status || "Pending Payroll Deduction"}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smartmart_damages_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Damage records exported to CSV.");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Damaged Items & Consequence Management</h1>
              <p className="text-muted-foreground text-sm">
                Process staff-reported merchandise damages, manage consequence status, and audit payroll deductions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDamages}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          {pendingList.length > 0 && (
            <button
              onClick={handleBatchConfirmPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Confirm All Pending ({pendingList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-xs text-center">
          <span className="text-xs text-muted-foreground font-semibold block">Total Incidents</span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">{totalIncidents}</span>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-xs text-center">
          <span className="text-xs text-muted-foreground font-semibold block">Units Damaged</span>
          <span className="text-2xl font-extrabold text-red-500 mt-1 block">-{totalUnits}</span>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-xs text-center">
          <span className="text-xs text-muted-foreground font-semibold block">Total Store Loss</span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">{peso(totalCost)}</span>
        </div>
        <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4 shadow-xs text-center">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold block">Pending Deductions</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
            {peso(pendingCost)}
          </span>
          <span className="text-[11px] text-amber-600 font-bold block mt-0.5">{pendingList.length} awaiting</span>
        </div>
        <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-4 shadow-xs text-center">
          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block">Settled Deductions</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {peso(settledCost)}
          </span>
          <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">{settledList.length} settled</span>
        </div>
        <div className="bg-muted/40 rounded-2xl border border-border p-4 shadow-xs text-center">
          <span className="text-xs text-muted-foreground font-semibold block">Waived (Store Loss)</span>
          <span className="text-2xl font-extrabold text-muted-foreground mt-1 block">{peso(waivedCost)}</span>
          <span className="text-[11px] text-muted-foreground font-bold block mt-0.5">{waivedList.length} waived</span>
        </div>
      </div>

      {/* Staff Liability Summary Cards */}
      {Object.keys(staffSummary).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <User size={16} className="text-emerald-500" />
            <span>Staff Liability Overview</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Object.entries(staffSummary).map(([staffName, s]) => (
              <div key={staffName} className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {staffName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">{staffName}</h4>
                      <p className="text-[11px] text-muted-foreground">{s.totalIncidents} incident(s) • {s.totalUnits} unit(s)</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-foreground">{peso(s.totalCost)}</span>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                  <span className="text-amber-600 font-bold">Pending: {peso(s.pendingCost)}</span>
                  <span className="text-emerald-600 font-bold">Settled: {peso(s.settledCost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card (The Process) */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search incident #, product, staff, or notes..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="p-2 text-muted-foreground hover:text-foreground rounded-xl"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Filter size={13} />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Deducted from Salary">Deducted from Salary</option>
              <option value="Waived - Store Loss">Waived (Store Loss)</option>
            </select>

            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="All">All Staff Members</option>
              {uniqueStaff.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Process Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4 text-left">Incident #</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Accountable Staff</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Penalty Cost</th>
                <th className="py-3 px-4 text-left">Incident Cause / Reason</th>
                <th className="py-3 px-4 text-center">Consequence Status</th>
                <th className="py-3 px-4 text-right">Admin Action (Process)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold">No damage incidents found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(d => {
                  const isPending = !d.consequence_status || d.consequence_status === "Pending Payroll Deduction";
                  const isDeducted = d.consequence_status === "Deducted from Salary";
                  const isWaived = d.consequence_status === "Waived - Store Loss";

                  return (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(d)}
                          className="hover:underline flex items-center gap-1"
                        >
                          {d.incident_no}
                          <ChevronRight size={12} className="opacity-60" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-foreground">{d.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.category || "General"}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                        {d.staff_name}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-500 font-mono whitespace-nowrap">
                        -{d.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-foreground font-mono whitespace-nowrap">
                        {peso(d.total_cost)}
                      </td>
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="text-foreground truncate font-medium" title={d.reason}>{d.reason}</p>
                        {d.notes && (
                          <p className="text-[10px] text-muted-foreground italic truncate" title={d.notes}>
                            "{d.notes}"
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDeducted
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : isWaived
                              ? "bg-muted text-muted-foreground border border-border"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse"
                          }`}
                        >
                          {d.consequence_status || "Pending Payroll Deduction"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            disabled={updatingId === d.id}
                            value={d.consequence_status || "Pending Payroll Deduction"}
                            onChange={e => handleUpdateStatus(d.id, e.target.value)}
                            className="px-2.5 py-1 text-xs font-bold rounded-xl border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          >
                            <option value="Pending Payroll Deduction">Pending</option>
                            <option value="Deducted from Salary">Confirm Deduction</option>
                            <option value="Waived - Store Loss">Waive (Store Loss)</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base leading-tight">
                    Incident {selectedIncident.incident_no}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reported on {new Date(selectedIncident.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Damaged Product:</span>
                  <strong className="text-foreground text-sm font-bold">{selectedIncident.product_name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Category:</span>
                  <span className="text-foreground font-semibold">{selectedIncident.category || "General"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Quantity Damaged:</span>
                  <span className="text-red-500 font-extrabold text-sm">-{selectedIncident.quantity} unit(s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Calculated Unit Cost:</span>
                  <span className="text-foreground font-mono">{peso(selectedIncident.unit_cost)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground font-bold">Total Consequence Penalty:</span>
                  <span className="text-red-600 dark:text-red-400 font-black text-base font-mono">
                    {peso(selectedIncident.total_cost)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-bold block">Accountable Staff Member:</span>
                <p className="text-sm font-extrabold text-foreground">{selectedIncident.staff_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-bold block">Reported Reason:</span>
                <p className="p-3 rounded-xl border border-border bg-background text-foreground font-semibold">
                  {selectedIncident.reason}
                </p>
              </div>

              {selectedIncident.notes && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-bold block">Staff Incident Notes:</span>
                  <p className="p-3 rounded-xl border border-border bg-background text-foreground italic">
                    "{selectedIncident.notes}"
                  </p>
                </div>
              )}

              {/* Status Selector in Modal */}
              <div className="p-4 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-700 dark:text-amber-300">
                    Process Consequence Decision:
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {selectedIncident.consequence_status || "Pending Payroll Deduction"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedIncident.id, "Deducted from Salary")}
                    className={`py-2 px-3 rounded-xl font-bold text-center transition-all ${
                      selectedIncident.consequence_status === "Deducted from Salary"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "border border-border bg-card text-foreground hover:bg-emerald-500/10"
                    }`}
                  >
                    Confirm Deduction
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedIncident.id, "Waived - Store Loss")}
                    className={`py-2 px-3 rounded-xl font-bold text-center transition-all ${
                      selectedIncident.consequence_status === "Waived - Store Loss"
                        ? "bg-slate-700 text-white shadow-xs"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    Waive Loss
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedIncident.id, "Pending Payroll Deduction")}
                    className={`py-2 px-3 rounded-xl font-bold text-center transition-all ${
                      !selectedIncident.consequence_status || selectedIncident.consequence_status === "Pending Payroll Deduction"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "border border-border bg-card text-foreground hover:bg-amber-500/10"
                    }`}
                  >
                    Set Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90"
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

