/// <reference path="../vite-env.d.ts" />
import { useState, useMemo, useCallback, createContext, useContext, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { api, resolveBackendUrl, getSavedUser, UserPayload, RegisteredCustomer, CustomerProfileData, StaffProfileData, DashboardSummary, TransactionItem, StaffItem } from "../api";
import logoImg from "../assets/SmartMart_Logo.jpg";
import ReportsPage from "./components/reports/ReportsPage";
import ReturnsManagement from "./components/returns/ReturnsManagement";
import RequestReturnModal from "./components/returns/RequestReturnModal";
import CustomerReturnHistoryView from "./components/returns/CustomerReturnHistoryView";
import CustomerAnalytics from "./components/analytics/CustomerAnalytics";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  LogOut, Search, Plus, Minus, Trash2, Bell, AlertTriangle,
  TrendingUp, CheckCircle, X, User, ClipboardList, Store,
  Receipt, Settings, Printer, ChevronRight, ShieldCheck, Pencil,
  Eye, EyeOff, Filter, Upload, Image as ImageIcon, Camera, Download,
  Flame, Sparkles, ArrowRight, Award, ArrowLeft, ChevronUp, ChevronDown, List,
  RotateCcw, Percent, Check, AlertCircle, Menu, MapPin, Phone, Clock, Zap, Star, ArrowDown, Lock, Sun, Moon,
  Loader2, Copy,
} from "lucide-react";

export const getProductImageUrl = (url?: string | null) => resolveBackendUrl(url);

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "login" | "admin" | "staff" | "customer";
type AdminPage = "dashboard" | "products" | "inventory" | "categories" | "sales" | "returns" | "customers" | "staff" | "reports" | "settings";
type StaffPage = "dashboard" | "pos" | "transactions" | "returns" | "profile";
type CustomerPage = "browse" | "history" | "analytics" | "returns-history" | "profile";

interface Product {
  id: number;
  name: string;
  category: string;
  category_id?: number;
  price: number;
  stock: number;
  lowStock: boolean;
  image_url?: string | null;
}

interface CartItem {
  product: Product;
  qty: number;
}

interface Transaction {
  id: string;
  customer: string;
  customerId?: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal?: number;
  discountType?: "None" | "Senior Citizen" | "PWD";
  discountIdNo?: string;
  discountAmount?: number;
  total: number;
  cash: number;
  change: number;
  date: string;
  cashier: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Snacks", "Non-Alcoholic Beverages", "Alcoholic Beverages", "Instant Foods", "Canned Goods", "Bread & Bakery",
  "Candies & Chocolates", "Dairy Products", "Cooking Essentials", "Personal Care",
  "Health & Wellness", "Household Essentials", "Baby Products",
  "School & Office Supplies", "Frozen Foods", "Miscellaneous",
];

const INITIAL_PRODUCTS: Product[] = [];
const STAFF_LIST: any[] = [];
const CUSTOMERS_LIST: any[] = [];
const TRANSACTIONS: Transaction[] = [];

const WEEKLY_DATA: Array<{ day: string; sales: number }> = [];
const MONTHLY_DATA: Array<{ month: string; sales: number }> = [];
const BEST_SELLERS: Array<{ name: string; sold: number; revenue: number }> = [];

// ─── Utilities ────────────────────────────────────────────────────────────────

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CAT_COLORS: Record<string, string> = {
  Snacks: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  "Non-Alcoholic Beverages": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  "Alcoholic Beverages": "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  "Instant Foods": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "Canned Goods": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  "Bread & Bakery": "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  "Candies & Chocolates": "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300",
  "Dairy Products": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  "Cooking Essentials": "bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-300",
  "Personal Care": "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
  "Household Essentials": "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300",
  "Health & Wellness": "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  "Baby Products": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  "School & Office Supplies": "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  "Frozen Foods": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
  Miscellaneous: "bg-gray-100 text-gray-800 dark:bg-slate-700/50 dark:text-slate-300",
};

const CAT_BG: Record<string, string> = {
  Snacks: "bg-amber-50 dark:bg-slate-800/80",
  "Non-Alcoholic Beverages": "bg-blue-50 dark:bg-slate-800/80",
  "Alcoholic Beverages": "bg-amber-50 dark:bg-slate-800/80",
  "Instant Foods": "bg-orange-50 dark:bg-slate-800/80",
  "Canned Goods": "bg-red-50 dark:bg-slate-800/80",
  "Bread & Bakery": "bg-yellow-50 dark:bg-slate-800/80",
  "Candies & Chocolates": "bg-pink-50 dark:bg-slate-800/80",
  "Dairy Products": "bg-sky-50 dark:bg-slate-800/80",
  "Cooking Essentials": "bg-lime-50 dark:bg-slate-800/80",
  "Personal Care": "bg-purple-50 dark:bg-slate-800/80",
  "Household Essentials": "bg-teal-50 dark:bg-slate-800/80",
  "Health & Wellness": "bg-green-50 dark:bg-slate-800/80",
  "Baby Products": "bg-rose-50 dark:bg-slate-800/80",
  "School & Office Supplies": "bg-violet-50 dark:bg-slate-800/80",
  "Frozen Foods": "bg-cyan-50 dark:bg-slate-800/80",
  Miscellaneous: "bg-gray-50 dark:bg-slate-800/80",
};

// ─── Custom Charts ────────────────────────────────────────────────────────────

interface ChartPoint { label: string; value: number; }

function getNiceScale(maxVal: number): { topVal: number; ticks: number[] } {
  if (maxVal <= 0) return { topVal: 1000, ticks: [0, 250, 500, 750, 1000] };
  if (maxVal <= 1000) return { topVal: 1000, ticks: [0, 250, 500, 750, 1000] };
  const pow10 = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const norm = maxVal / pow10;
  let niceNorm = 10;
  if (norm <= 1.25) niceNorm = 1.25;
  else if (norm <= 2) niceNorm = 2;
  else if (norm <= 2.5) niceNorm = 2.5;
  else if (norm <= 5) niceNorm = 5;
  else niceNorm = 10;
  const topVal = Math.round(niceNorm * pow10);
  const step = topVal / 4;
  return { topVal, ticks: [0, step, step * 2, step * 3, topVal] };
}

function SimpleBarChart({ data, height = 200, color = "#10b981", formatY, customTicks, maxY }: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
  customTicks?: number[];
  maxY?: number;
}) {
  const safeData = data && data.length > 0 ? data : [{ label: "N/A", value: 0 }];
  const dataMax = Math.max(0, ...safeData.map(d => d.value));

  let topVal: number;
  let ticks: number[];

  if (customTicks && customTicks.length > 0) {
    const customMax = customTicks[customTicks.length - 1];
    if (dataMax <= customMax && !maxY) {
      topVal = customMax;
      ticks = customTicks;
    } else {
      const scale = getNiceScale(Math.max(dataMax, maxY ?? customMax));
      topVal = scale.topVal;
      ticks = scale.ticks;
    }
  } else if (maxY) {
    topVal = maxY;
    const step = topVal / 4;
    ticks = [0, step, step * 2, step * 3, topVal];
  } else {
    const scale = getNiceScale(dataMax);
    topVal = scale.topVal;
    ticks = scale.ticks;
  }

  const defaultFmt = (v: number) => {
    if (v === 0) return "₱0";
    if (v >= 1000000) return `₱${(v / 1000000).toFixed(1)}M`;
    if (v >= 10000) return `₱${(v / 1000).toLocaleString()}K`;
    return `₱${v.toLocaleString()}`;
  };

  const fmt = formatY ?? defaultFmt;
  const svgH = height;
  const padT = 12;
  const padB = 28;
  const padL = 52;
  const padR = 12;
  const chartH = svgH - padT - padB;
  const chartW = 600 - padL - padR;

  const slotW = chartW / safeData.length;
  const barW = Math.min(32, Math.max(10, Math.floor(slotW * 0.58)));

  return (
    <div style={{ width: "100%", height: svgH }}>
      <svg width="100%" height={svgH} viewBox="0 0 600 200" preserveAspectRatio="none" className="overflow-visible">
        {/* Grid lines & Y-axis labels */}
        {ticks.map(tick => {
          const y = padT + chartH * (1 - (topVal > 0 ? tick / topVal : 0));
          return (
            <g key={`g-${tick}`}>
              <line x1={padL} x2={600 - padR} y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} strokeDasharray="2 2" />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="#94a3b8" fontWeight="600" style={{ fontFamily: "'DM Mono', monospace" }}>
                {fmt(tick)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {safeData.map((d, i) => {
          const x = padL + slotW * i + (slotW - barW) / 2;
          const barH = topVal > 0 && d.value > 0 ? Math.max(3, (d.value / topVal) * chartH) : 0;
          const y = padT + chartH - barH;
          return (
            <g key={`b-${i}`} className="group cursor-pointer">
              <title>{`${d.label}: ₱${Number(d.value).toLocaleString()}`}</title>
              {barH > 0 ? (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={color}
                    rx={4}
                    ry={4}
                    opacity={0.88}
                    className="transition-all duration-200 hover:opacity-100"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.min(3, barH)}
                    fill={color}
                    rx={2}
                    ry={2}
                  />
                </>
              ) : (
                <rect
                  x={x}
                  y={padT + chartH - 1.5}
                  width={barW}
                  height={1.5}
                  fill="#e2e8f0"
                  rx={1}
                />
              )}
              {(() => {
                const total = safeData.length;
                const step = total <= 10 ? 1 : total <= 15 ? 2 : total <= 20 ? 3 : 5;
                if (i % step !== 0 && i !== total - 1) return null;
                return (
                  <text
                    x={padL + slotW * i + slotW / 2}
                    y={svgH - 8}
                    textAnchor="middle"
                    fontSize={total > 15 ? 8.5 : total > 8 ? 9.5 : 11}
                    fill="#64748b"
                    fontWeight="600"
                  >
                    {d.label}
                  </text>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SimpleLineChart({ data, height = 240, color = "#10b981", formatY }: {
  data: ChartPoint[]; height?: number; color?: string; formatY?: (v: number) => string;
}) {
  const safeData = data && data.length > 0 ? data : [{ label: "N/A", value: 0 }];
  const dataMax = Math.max(0, ...safeData.map(d => d.value));
  const { topVal, ticks } = getNiceScale(dataMax);

  const defaultFmt = (v: number) => {
    if (v === 0) return "₱0";
    if (v >= 1000000) return `₱${(v / 1000000).toFixed(1)}M`;
    if (v >= 10000) return `₱${(v / 1000).toLocaleString()}K`;
    return `₱${v.toLocaleString()}`;
  };

  const fmt = formatY ?? defaultFmt;
  const svgH = height;
  const padT = 16;
  const padB = 28;
  const padL = 52;
  const padR = 20;
  const chartH = svgH - padT - padB;
  const chartW = 600 - padL - padR;

  const px = (i: number) => padL + (safeData.length > 1 ? (i / (safeData.length - 1)) * chartW : chartW / 2);
  const py = (v: number) => padT + chartH * (1 - (topVal > 0 ? v / topVal : 0));

  const pathD = safeData.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(d.value)}`).join(" ");
  const areaD = safeData.length > 1
    ? `${pathD} L ${px(safeData.length - 1)} ${padT + chartH} L ${px(0)} ${padT + chartH} Z`
    : "";

  return (
    <div style={{ width: "100%", height: svgH }}>
      <svg width="100%" height={svgH} viewBox="0 0 600 240" preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="lg-area-emerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {/* Grid lines & Y-axis labels */}
        {ticks.map(tick => {
          const y = padT + chartH * (1 - (topVal > 0 ? tick / topVal : 0));
          return (
            <g key={`g-${tick}`}>
              <line x1={padL} x2={600 - padR} y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} strokeDasharray="2 2" />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="#94a3b8" fontWeight="600" style={{ fontFamily: "'DM Mono', monospace" }}>
                {fmt(tick)}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        {areaD && <path d={areaD} fill="url(#lg-area-emerald)" />}
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots + labels */}
        {safeData.map((d, i) => (
          <g key={`d-${i}`} className="group cursor-pointer">
            <title>{`${d.label}: ₱${Number(d.value).toLocaleString()}`}</title>
            <circle cx={px(i)} cy={py(d.value)} r={4.5} fill="#ffffff" stroke={color} strokeWidth={2.5} className="transition-transform group-hover:scale-125" />
            {(() => {
              const total = safeData.length;
              const step = total <= 10 ? 1 : total <= 15 ? 2 : total <= 20 ? 3 : 5;
              if (i % step !== 0 && i !== total - 1) return null;
              return (
                <text
                  x={px(i)}
                  y={svgH - 8}
                  textAnchor="middle"
                  fontSize={total > 15 ? 8.5 : total > 8 ? 9.5 : 11}
                  fill="#64748b"
                  fontWeight="600"
                >
                  {d.label}
                </text>
              );
            })()}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info";

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    default: "bg-muted text-muted-foreground border border-border",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${cls[variant]}`}>
      {children}
    </span>
  );
}

type StatColor = "green" | "blue" | "amber" | "purple" | "red" | "gray";

function StatCard({ icon, label, value, sub, color = "green" }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: StatColor;
}) {
  const cfg: Record<StatColor, { icon: string; bar: string }> = {
    green: { icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20", bar: "bg-emerald-500" },
    blue: { icon: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20", bar: "bg-blue-500" },
    amber: { icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20", bar: "bg-amber-500" },
    purple: { icon: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20", bar: "bg-purple-500" },
    red: { icon: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20", bar: "bg-rose-500" },
    gray: { icon: "bg-muted text-muted-foreground border border-border", bar: "bg-muted-foreground" },
  };
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col gap-3 hover:shadow-md hover:border-emerald-500/30 transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg[color].icon}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xl font-extrabold text-foreground mt-1 leading-tight truncate tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type SidebarRole = "admin" | "staff" | "customer";

interface NavItem { id: string; icon: React.ReactNode; label: string; }

const NAV_ITEMS: Record<SidebarRole, NavItem[]> = {
  admin: [
    { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { id: "products", icon: <Package size={18} />, label: "Products" },
    { id: "categories", icon: <ClipboardList size={18} />, label: "Categories" },
    { id: "inventory", icon: <BarChart3 size={18} />, label: "Inventory" },
    { id: "sales", icon: <ShoppingCart size={18} />, label: "Sales" },
    { id: "returns", icon: <RotateCcw size={18} />, label: "Returns" },
    { id: "customers", icon: <User size={18} />, label: "Customers" },
    { id: "staff", icon: <Users size={18} />, label: "Staff" },
    { id: "reports", icon: <TrendingUp size={18} />, label: "Reports" },
    { id: "settings", icon: <Settings size={18} />, label: "Settings" },
  ],
  staff: [
    { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { id: "pos", icon: <ShoppingCart size={18} />, label: "Point of Sale" },
    { id: "inventory", icon: <BarChart3 size={18} />, label: "Inventory" },
    { id: "transactions", icon: <Receipt size={18} />, label: "Transactions" },
    { id: "returns", icon: <RotateCcw size={18} />, label: "Returns" },
    { id: "profile", icon: <User size={18} />, label: "My Profile" },
  ],
  customer: [
    { id: "browse", icon: <Store size={18} />, label: "Browse Products" },
    { id: "history", icon: <Receipt size={18} />, label: "Purchase History" },
    { id: "analytics", icon: <TrendingUp size={18} />, label: "Spending Analytics" },
    { id: "returns-history", icon: <RotateCcw size={18} />, label: "Return History" },
    { id: "profile", icon: <User size={18} />, label: "My Profile" },
  ],
};

const ROLE_LABELS: Record<SidebarRole, string> = {
  admin: "Administrator",
  staff: "Cashier",
  customer: "Customer",
};

function Sidebar({
  role,
  activePage,
  onNavigate,
  onLogout,
  userName,
  pendingCount = 0,
  pendingReturnsCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}: {
  role: SidebarRole;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userName: string;
  pendingCount?: number;
  pendingReturnsCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <aside className={`${isCollapsed ? "w-20" : "w-64"} min-h-screen flex flex-col shrink-0 bg-[#0f172a] border-r border-slate-800/70 transition-[width] duration-300 ease-in-out select-none`}>
      {/* Brand */}
      <div className={`py-4 border-b border-slate-800/60 ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} min-w-0`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-md ring-2 ring-emerald-500/20 shadow-emerald-500/10">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-black text-base leading-tight tracking-tight">SmartMart</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <p className="text-slate-400 text-xs truncate mt-0.5 font-medium">{ROLE_LABELS[role]} Portal</p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors shrink-0"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto scrollbar-hide ${isCollapsed ? "px-2" : "px-3"}`}>
        {NAV_ITEMS[role].map(item => (
          isCollapsed ? (
            <div key={item.id} className="relative group flex justify-center">
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all relative ${
                  activePage === item.id
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                {item.icon}
                {item.id === "customers" && pendingCount > 0 && (
                  <span className="w-4 h-4 bg-amber-400 text-slate-900 text-[9px] font-black rounded-full flex items-center justify-center shrink-0 absolute -top-1 -right-1 shadow-sm">
                    {pendingCount}
                  </span>
                )}
                {item.id === "returns" && pendingReturnsCount > 0 && (
                  <span className="w-4 h-4 bg-amber-400 text-slate-900 text-[9px] font-black rounded-full flex items-center justify-center shrink-0 absolute -top-1 -right-1 shadow-sm">
                    {pendingReturnsCount}
                  </span>
                )}
              </button>
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-slate-700/60 flex items-center gap-1.5">
                <span>{item.label}</span>
                {item.id === "customers" && pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded-full">
                    {pendingCount}
                  </span>
                )}
                {item.id === "returns" && pendingReturnsCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded-full">
                    {pendingReturnsCount}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activePage === item.id
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)] font-bold"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "customers" && pendingCount > 0 && (
                <span className="w-5 h-5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full flex items-center justify-center shrink-0 shadow-sm">{pendingCount}</span>
              )}
              {item.id === "returns" && pendingReturnsCount > 0 && (
                <span className="w-5 h-5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full flex items-center justify-center shrink-0 shadow-sm">{pendingReturnsCount}</span>
              )}
            </button>
          )
        ))}
      </nav>

      {/* User + Logout */}
      {isCollapsed ? (
        <div className="px-2 py-4 border-t border-slate-800/60 flex flex-col items-center space-y-3">
          <div className="relative group flex justify-center">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md cursor-default">
              {initials}
            </div>
            <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-slate-700/60">
              <p className="font-bold">{userName}</p>
              <p className="text-slate-400 text-[10px]">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <div className="relative group flex justify-center">
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
            >
              <LogOut size={18} />
            </button>
            <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-slate-700/60">
              Logout
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 py-4 border-t border-slate-800/60 space-y-1.5">
          <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl bg-slate-800/30 border border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-slate-100 text-sm font-bold truncate leading-tight">{userName}</p>
              <p className="text-slate-400 text-xs mt-0.5">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

const FEATURED = [
  { emoji: "🥤", name: "Coca-Cola 500ml", price: 40, category: "Non-Alcoholic Beverages" },
  { emoji: "🍟", name: "Piattos Cheese 85g", price: 25, category: "Snacks" },
  { emoji: "🍪", name: "Rebisco Crackers", price: 10, category: "Snacks" },
  { emoji: "🥛", name: "Eden Cheese 165g", price: 95, category: "Dairy Products" },
];


// ── Dedicated Login Page ──────────────────────────────────────────────────────
function LoginPage({ onLogin, onBack, onGoRegister }: { onLogin: (role: Role) => void; onBack: () => void; onGoRegister: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const performLogin = async (u: string, p: string) => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.auth.login(u, p);
      setSuccessMsg(`Welcome back, ${res.user.name || res.user.username}!`);
      setTimeout(() => onLogin(res.user.role), 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!username.trim() || !password) {
      setErrorMsg("Please enter both username and password.");
      return;
    }
    performLogin(username.trim(), password);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-hidden selection:bg-emerald-500 selection:text-white transition-colors">

      {/* ── Ambient Background Glows ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-emerald-500/10 dark:from-emerald-500/15 via-teal-500/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-600/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -left-20 w-[450px] h-[450px] bg-teal-600/5 dark:bg-teal-600/10 blur-[150px] pointer-events-none rounded-full" />

      {/* ── Frosted Glass Navbar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3 group text-left">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.3)] ring-1 ring-emerald-500/30 shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-black text-foreground text-lg tracking-tight group-hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                SmartMart <span className="text-emerald-500 font-extrabold text-sm">●</span>
              </span>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider hidden sm:block">
                Convenience Store Portal
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border shadow-sm transition-all"
            >
              <ArrowLeft size={15} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 relative z-10">
        <div className="w-full max-w-md">

          {/* Glassmorphic Login Card */}
          <div className="relative rounded-3xl bg-card border border-border p-7 sm:p-9 shadow-2xl">
            
            {/* Top Brand & Badge */}
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4 shadow-[0_0_25px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/40">
                <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold uppercase tracking-widest mb-3">
                <ShieldCheck size={13} className="text-emerald-500" />
                Store Sign In
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Welcome Back!
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-relaxed">
                Enter your credentials to access your store portal
              </p>
            </div>

            {/* Inline Messages */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-sm">
                <AlertTriangle size={15} className="shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-sm">
                <CheckCircle size={15} className="shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <div className="space-y-4">
              
              {/* Username Input */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-background accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                    Remember me on this browser
                  </span>
                </label>
              </div>

              {/* Login Button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-white font-black rounded-xl transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.55)] text-sm tracking-wide flex items-center justify-center gap-2 group cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">New Customer?</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Register Action */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-3">Don&apos;t have an account yet?</p>
              <button
                onClick={onGoRegister}
                className="w-full py-3 bg-muted hover:bg-muted/80 border border-border hover:border-emerald-500/40 text-foreground font-extrabold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Register New Customer Account</span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Security Footnote */}
            <div className="mt-6 pt-5 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-medium">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
              <span>Multi-role access: Admin, Cashier POS & Customer</span>
            </div>

          </div>

        </div>
      </div>

      {/* ── Forgot Password Dialog Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border text-foreground rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Lock size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">Need Password Assistance?</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                For security, account credentials can be reset directly by store staff at the cashier counter or by contacting the system administrator.
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded-2xl p-3.5 text-[11px] text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">In-Store Assistance:</p>
              <p>📍 SmartMart Main Branch Cashier Counter</p>
              <p>⏰ Mon - Sun: 7:00 AM – 10:00 PM</p>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors shadow-md"
            >
              Understood
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────────────────────
function RegisterPage({ onLogin: _onLogin, onBack, onGoLogin }: { onLogin: (role: Role) => void; onBack: () => void; onGoLogin: () => void }) {
  const { addPendingCustomer } = useStore();
  const [submitted, setSubmitted] = useState(false);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [discountType, setDiscountType] = useState<"None" | "Senior Citizen" | "PWD">("None");
  const [discountIdNo, setDiscountIdNo] = useState("");

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium";
  const selectCls = `${inputCls} text-foreground`;

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    const errors: Record<string, string> = {};

    // Name validations
    if (!lastName.trim()) errors.lastName = "Last name is required.";
    else if (!/^[A-Za-zÀ-ÿñÑ\s'-]+$/.test(lastName.trim())) errors.lastName = "Last name must contain letters only.";

    if (!firstName.trim()) errors.firstName = "First name is required.";
    else if (!/^[A-Za-zÀ-ÿñÑ\s'-]+$/.test(firstName.trim())) errors.firstName = "First name must contain letters only.";

    if (middleName.trim() && !/^[A-Za-zÀ-ÿñÑ\s'-]+$/.test(middleName.trim())) errors.middleName = "Middle name must contain letters only.";

    // Address validation
    if (!address.trim()) errors.address = "Address is required.";
    else if (address.trim().length < 5) errors.address = "Address is too short. Please enter a valid address.";

    // Date of birth validation
    if (!dob) errors.dob = "Date of birth is required.";
    else {
      const dobDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear() - (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
      if (age < 12) errors.dob = "You must be at least 12 years old to register.";
    }

    if (!civilStatus) errors.civilStatus = "Civil status is required.";
    if (!gender) errors.gender = "Gender is required.";

    // Phone validation — Philippine format: must start with 09 and be exactly 11 digits
    if (!phone.trim()) errors.phone = "Phone number is required.";
    else if (!/^\d+$/.test(phone.trim())) errors.phone = "Phone number must contain numbers only.";
    else if (phone.trim().length !== 11) errors.phone = "Phone number must be exactly 11 digits (e.g. 09XXXXXXXXX).";
    else if (!phone.trim().startsWith("09")) errors.phone = "Phone number must start with 09 (e.g. 09XXXXXXXXX).";

    if (discountType !== "None" && !discountIdNo.trim()) {
      errors.discountIdNo = `${discountType} ID number is required to verify eligibility.`;
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields correctly before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.customers.register({
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        address: address.trim(),
        date_of_birth: dob,
        civil_status: civilStatus,
        gender,
        phone: phone.trim(),
        discount_type: discountType,
        discount_id_no: discountType !== "None" ? discountIdNo.trim() : undefined,
      });
      addPendingCustomer({
        id: String(res.customer_id),
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        address: address.trim(),
        dob,
        status: civilStatus,
        gender,
        phone: phone.trim(),
      });
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit registration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-hidden selection:bg-emerald-500 selection:text-white transition-colors">
      {/* ── Ambient Background Glows ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-emerald-500/10 dark:from-emerald-500/15 via-teal-500/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-600/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -left-20 w-[450px] h-[450px] bg-teal-600/5 dark:bg-teal-600/10 blur-[150px] pointer-events-none rounded-full" />

      {/* ── Frosted Glass Navbar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3 group text-left">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.3)] ring-1 ring-emerald-500/30 shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-black text-foreground text-lg tracking-tight group-hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                SmartMart <span className="text-emerald-500 font-extrabold text-sm">●</span>
              </span>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider hidden sm:block">
                Customer Registration
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border shadow-sm transition-all"
            >
              <ArrowLeft size={15} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        {submitted ? (
          <div className="w-full max-w-md text-center">
            <div className="relative rounded-3xl bg-card border border-border p-9 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 text-3xl shadow-inner text-amber-500">
                ⏳
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">Application Submitted!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Your registration is now <span className="font-bold text-amber-500">pending approval</span>. Visit the SmartMart store counter and our staff will provide your login credentials once verified.
              </p>
              <div className="bg-muted/50 border border-border rounded-2xl p-4 text-left mb-6 space-y-2">
                <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">What happens next?</p>
                <p className="text-xs text-foreground/80">1. Admin reviews your customer registration</p>
                <p className="text-xs text-foreground/80">2. Account credentials get activated</p>
                <p className="text-xs text-foreground/80">3. Receive your username & password in-store</p>
                <p className="text-xs text-foreground/80">4. Sign in to view receipts and earn shopping perks!</p>
              </div>
              <button onClick={onBack} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-colors text-sm shadow-md cursor-pointer">
                Back to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <div className="relative rounded-3xl bg-card border border-border p-7 sm:p-9 shadow-2xl">
              <div className="text-center mb-7">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <User size={26} className="text-emerald-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Customer Registration</h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Fill in your information to join SmartMart</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Personal Information</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Last Name <span className="text-red-500">*</span></label>
                    <input value={lastName} onChange={e => { setLastName(e.target.value); setFormErrors(prev => ({ ...prev, lastName: "" })); }} placeholder="Dela Cruz" className={`${inputCls} ${formErrors.lastName ? "border-red-500 ring-2 ring-red-500/20" : ""}`} />
                    {formErrors.lastName && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">First Name <span className="text-red-500">*</span></label>
                    <input value={firstName} onChange={e => { setFirstName(e.target.value); setFormErrors(prev => ({ ...prev, firstName: "" })); }} placeholder="Juan" className={`${inputCls} ${formErrors.firstName ? "border-red-500 ring-2 ring-red-500/20" : ""}`} />
                    {formErrors.firstName && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.firstName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Middle Name <span className="text-muted-foreground/70 font-normal text-xs">(optional)</span></label>
                  <input value={middleName} onChange={e => { setMiddleName(e.target.value); setFormErrors(prev => ({ ...prev, middleName: "" })); }} placeholder="Santos" className={`${inputCls} ${formErrors.middleName ? "border-red-500 ring-2 ring-red-500/20" : ""}`} />
                  {formErrors.middleName && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.middleName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Address <span className="text-red-500">*</span></label>
                  <input value={address} onChange={e => { setAddress(e.target.value); setFormErrors(prev => ({ ...prev, address: "" })); }} placeholder="Brgy. Poblacion, Bilar, Bohol" className={`${inputCls} ${formErrors.address ? "border-red-500 ring-2 ring-red-500/20" : ""}`} />
                  {formErrors.address && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                    <input type="date" value={dob} onChange={e => { setDob(e.target.value); setFormErrors(prev => ({ ...prev, dob: "" })); }} className={`${inputCls} ${formErrors.dob ? "border-red-500 ring-2 ring-red-500/20" : ""}`} />
                    {formErrors.dob && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.dob}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Gender <span className="text-red-500">*</span></label>
                    <select value={gender} onChange={e => { setGender(e.target.value); setFormErrors(prev => ({ ...prev, gender: "" })); }} className={`${selectCls} ${formErrors.gender ? "border-red-500 ring-2 ring-red-500/20" : ""}`}>
                      <option value="" className="bg-card text-foreground">Select</option>
                      <option className="bg-card text-foreground">Male</option>
                      <option className="bg-card text-foreground">Female</option>
                      <option className="bg-card text-foreground">Prefer not to say</option>
                    </select>
                    {formErrors.gender && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.gender}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Civil Status <span className="text-red-500">*</span></label>
                    <select value={civilStatus} onChange={e => { setCivilStatus(e.target.value); setFormErrors(prev => ({ ...prev, civilStatus: "" })); }} className={`${selectCls} ${formErrors.civilStatus ? "border-red-500 ring-2 ring-red-500/20" : ""}`}>
                      <option value="" className="bg-card text-foreground">Select</option>
                      <option className="bg-card text-foreground">Single</option>
                      <option className="bg-card text-foreground">Married</option>
                      <option className="bg-card text-foreground">Widowed</option>
                      <option className="bg-card text-foreground">Separated</option>
                    </select>
                    {formErrors.civilStatus && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.civilStatus}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      value={phone}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setPhone(val);
                        setFormErrors(prev => ({ ...prev, phone: "" }));
                      }}
                      placeholder="09XXXXXXXXX"
                      inputMode="numeric"
                      maxLength={11}
                      className={`${inputCls} ${formErrors.phone ? "border-red-500 ring-2 ring-red-500/20" : ""}`}
                    />
                    {formErrors.phone ? (
                      <p className="text-xs text-red-500 font-medium mt-1">{formErrors.phone}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-1">11 digits starting with 09</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Discount Eligibility (Senior Citizen / PWD)
                  </label>
                  <p className="text-xs text-muted-foreground mb-2.5">
                    Senior Citizens and Persons with Disabilities (PWD) receive a 5% discount on purchases.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {(["None", "Senior Citizen", "PWD"] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setDiscountType(type);
                          if (type === "None") setDiscountIdNo("");
                          setFormErrors(prev => ({ ...prev, discountIdNo: "" }));
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          discountType === type
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {type === "Senior Citizen" ? "Senior Citizen" : type}
                      </button>
                    ))}
                  </div>
                  {discountType !== "None" && (
                    <div className="mt-2.5">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        {discountType === "Senior Citizen" ? "OSCA / Senior Citizen ID No." : "PWD ID No."}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={discountIdNo}
                        onChange={e => {
                          setDiscountIdNo(e.target.value);
                          setFormErrors(prev => ({ ...prev, discountIdNo: "" }));
                        }}
                        placeholder={
                          discountType === "Senior Citizen"
                            ? "Enter OSCA / Senior Citizen ID No."
                            : "Enter PWD ID No."
                        }
                        className={`${inputCls} font-mono ${formErrors.discountIdNo ? "border-red-500 ring-2 ring-red-500/20" : ""}`}
                      />
                      {formErrors.discountIdNo ? (
                        <p className="text-xs text-red-500 font-medium mt-1">{formErrors.discountIdNo}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Your ID number will be verified at checkout to automatically apply your 5% discount.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground pt-1">Fields marked with <span className="text-red-500">*</span> are required.</p>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-white font-black rounded-xl transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)] text-sm mt-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Registration</span>
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <button onClick={onGoLogin} className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer">
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const CAT_META: Record<string, { emoji: string; desc: string }> = {
  Snacks: { emoji: "🥨", desc: "Chips, crackers & more" },
  "Non-Alcoholic Beverages": { emoji: "🥤", desc: "Drinks, juice & coffee" },
  "Alcoholic Beverages": { emoji: "🍺", desc: "Beer & alcoholic drinks" },
  "Instant Foods": { emoji: "🍜", desc: "Noodles & ready meals" },
  "Canned Goods": { emoji: "🥫", desc: "Tuna, corned beef & more" },
  "Bread & Bakery": { emoji: "🍞", desc: "Loaf, rolls & pastries" },
  "Candies & Chocolates": { emoji: "🍬", desc: "Sweets & treats" },
  "Dairy Products": { emoji: "🥛", desc: "Milk, cheese & yogurt" },
  "Cooking Essentials": { emoji: "🍚", desc: "Rice, sauces & condiments" },
  "Personal Care": { emoji: "🧴", desc: "Soap, shampoo & more" },
  "Health & Wellness": { emoji: "💊", desc: "Medicine & supplements" },
  "Household Essentials": { emoji: "🧹", desc: "Cleaning & home supplies" },
  "Baby Products": { emoji: "👶", desc: "Diapers & baby care" },
  "School & Office Supplies": { emoji: "✏️", desc: "Pens, paper & stationery" },
  "Frozen Foods": { emoji: "🧊", desc: "Ice cream, hotdog & more" },
  Miscellaneous: { emoji: "📦", desc: "Other useful items" },
};

// ─── Shared Store (single source of truth for all roles) ──────────────────────

type CatMeta = Record<string, { emoji: string; desc: string }>;

type StoreInfo = { name: string; address: string; contact: string; email: string; hours: string; taxRate: string };

type PendingCustomer = {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  dob: string;
  status: string;
  gender: string;
  phone: string;
  submittedAt: string;
};

type StoreValue = {
  products: Product[];
  categories: string[];
  catMeta: CatMeta;
  storeInfo: StoreInfo;
  pendingCustomers: PendingCustomer[];
  registeredCustomers: RegisteredCustomer[];
  transactions: TransactionItem[];
  refreshData: () => Promise<void>;
  addProduct: (p: Omit<Product, "id" | "lowStock">) => void;
  addCategory: (name: string, emoji: string, desc: string) => void;
  updateStoreInfo: (info: StoreInfo) => void;
  addPendingCustomer: (c: Partial<PendingCustomer> & Omit<PendingCustomer, "submittedAt">) => void;
  approvePendingCustomer: (id: string, username?: string, password?: string) => Promise<void>;
  denyPendingCustomer: (id: string) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
};

const StoreContext = createContext<StoreValue | null>(null);

function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

function StoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("smartmart_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("smartmart_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [catMeta, setCatMeta] = useState<CatMeta>(CAT_META);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "SmartMart", address: "Zamora, Bilar, Bohol", contact: "09704972414",
    email: "hello@smartmart.ph", hours: "8:00 AM – 10:00 PM", taxRate: "12",
  });
  const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<RegisteredCustomer[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const refreshData = useCallback(async () => {
    try {
      const [catsRes, prodsRes, settingsRes, pendingRes, registeredRes, trxRes] = await Promise.allSettled([
        api.categories.getAll(),
        api.products.getPublic().catch(() => api.products.getAll()),
        api.settings.get(),
        api.customers.getPending(),
        api.customers.getRegistered(),
        api.transactions.getAll(),
      ]);

      if (catsRes.status === "fulfilled" && catsRes.value.length > 0) {
        setCategories(catsRes.value.map(c => c.name));
      }
      if (prodsRes.status === "fulfilled") {
        setProducts(prodsRes.value.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          category_id: p.category_id,
          price: Number(p.price),
          stock: p.stock,
          lowStock: p.stock <= (p.low_stock_threshold || 10),
          image_url: p.image_url || null,
        })));
      }
      if (settingsRes.status === "fulfilled" && Object.keys(settingsRes.value).length > 0) {
        const s = settingsRes.value;
        setStoreInfo({
          name: s.store_name || "SmartMart",
          address: s.store_address || "Zamora, Bilar, Bohol",
          contact: s.store_contact || "09704972414",
          email: s.store_email || "hello@smartmart.ph",
          hours: s.store_hours || "8:00 AM – 10:00 PM",
          taxRate: s.tax_rate || "12",
        });
      }
      if (pendingRes.status === "fulfilled") {
        setPendingCustomers(pendingRes.value.map(c => ({
          id: String(c.id),
          lastName: c.last_name,
          firstName: c.first_name,
          middleName: c.middle_name || "",
          address: c.address,
          dob: c.date_of_birth,
          status: c.civil_status,
          gender: c.gender,
          phone: c.phone,
          submittedAt: c.submitted_at,
        })));
      }
      if (registeredRes.status === "fulfilled") {
        setRegisteredCustomers(registeredRes.value);
      }
      if (trxRes.status === "fulfilled") {
        setTransactions(trxRes.value);
      }
    } catch (e) {
      console.warn("Could not sync with backend server yet:", e);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time auto sync for products & inventory stock (polls every 3 seconds when page is active)
  useEffect(() => {
    const pollStock = () => {
      if (document.hidden) return;
      api.products.getPublic()
        .catch(() => api.products.getAll())
        .then(prods => {
          if (Array.isArray(prods)) {
            setProducts(prevProds => {
              const hasChange = prods.length !== prevProds.length || prods.some(p => {
                const prev = prevProds.find(item => item.id === p.id);
                return !prev || prev.stock !== p.stock || prev.price !== Number(p.price) || prev.name !== p.name;
              });
              if (!hasChange) return prevProds;
              return prods.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                category_id: p.category_id,
                price: Number(p.price),
                stock: p.stock,
                lowStock: p.stock <= (p.low_stock_threshold || 10),
                image_url: p.image_url || null,
              }));
            });
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(pollStock, 3000);
    return () => clearInterval(interval);
  }, []);

  // Listen to real-time events and multi-tab broadcast messages
  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };

    window.addEventListener("smartmart:refresh-data", handleSync);
    window.addEventListener("smartmart:stock-updated", handleSync);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("smartmart_sync");
        channel.onmessage = (e) => {
          if (e.data?.type === "REFRESH_DATA" || e.data?.type === "STOCK_UPDATED") {
            refreshData();
          }
        };
      } catch {}
    }

    const onVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("smartmart:refresh-data", handleSync);
      window.removeEventListener("smartmart:stock-updated", handleSync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (channel) channel.close();
    };
  }, [refreshData]);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "lowStock">) => {
    try {
      const cats = await api.categories.getAll();
      const catObj = cats.find(c => c.name.toLowerCase() === p.category.toLowerCase());
      const catId = catObj ? catObj.id : 1;
      await api.products.create({ name: p.name, category_id: catId, price: p.price, stock: p.stock });
      toast.success("Product created!");
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    }
  }, [refreshData]);

  const addCategory = useCallback(async (name: string, emoji: string, desc: string) => {
    try {
      await api.categories.create(name);
      setCatMeta(prev => ({ ...prev, [name]: { emoji, desc } }));
      toast.success("Category added!");
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    }
  }, [refreshData]);

  const updateStoreInfo = useCallback(async (info: StoreInfo) => {
    try {
      await api.settings.update({
        store_name: info.name,
        store_address: info.address,
        store_contact: info.contact,
        store_email: info.email,
        store_hours: info.hours,
        tax_rate: info.taxRate,
      });
      setStoreInfo(info);
      toast.success("Store information updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
      throw err;
    }
  }, []);

  const addPendingCustomer = useCallback((c: Partial<PendingCustomer> & Omit<PendingCustomer, "submittedAt">) => {
    const id = c.id || `PND${String(Date.now()).slice(-5)}`;
    const submittedAt = c.submittedAt || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setPendingCustomers(prev => [...prev, { ...c, id: String(id), submittedAt } as PendingCustomer]);
    refreshData();
  }, [refreshData]);

  const approvePendingCustomer = useCallback(async (id: string, username?: string, password?: string) => {
    if (username && password) {
      await api.customers.approve(id, username, password);
      toast.success(`Customer account approved for "${username}"!`);
    }
    setPendingCustomers(prev => prev.filter(c => String(c.id) !== String(id)));
    await refreshData();
  }, [refreshData]);

  const denyPendingCustomer = useCallback(async (id: string) => {
    await api.customers.deny(id);
    setPendingCustomers(prev => prev.filter(c => String(c.id) !== String(id)));
    toast.info("Customer registration denied.");
    await refreshData();
  }, [refreshData]);

  const value = useMemo(
    () => ({
      products, categories, catMeta, storeInfo, pendingCustomers, registeredCustomers, transactions,
      refreshData, addProduct, addCategory, updateStoreInfo, addPendingCustomer, approvePendingCustomer, denyPendingCustomer,
      theme, toggleTheme, setTheme,
    }),
    [products, categories, catMeta, storeInfo, pendingCustomers, registeredCustomers, transactions, refreshData, addProduct, addCategory, updateStoreInfo, addPendingCustomer, approvePendingCustomer, denyPendingCustomer, theme, toggleTheme, setTheme],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ── Shared Light / Dark Theme Toggle Button ──────────────────────────────────
export function ThemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { theme, toggleTheme } = useStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`w-9 h-9 rounded-xl transition-all duration-200 flex items-center justify-center border select-none cursor-pointer ${
        isDark
          ? "bg-slate-800/90 text-amber-300 border-white/10 hover:bg-slate-700 hover:border-amber-400/40 shadow-sm"
          : "bg-slate-100 text-slate-700 border-slate-300/80 hover:bg-slate-200 hover:text-slate-900 shadow-sm"
      } ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun size={17} className="text-amber-400 shrink-0 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={17} className="text-indigo-600 shrink-0 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}

// ── Public Navbar shared across all public pages ───────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  const [page, setPage] = useState<"home" | "login" | "register">("home");
  const { storeInfo, products } = useStore();
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [loadingBestSellers, setLoadingBestSellers] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.products.getBestSellers(12)
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setBestSellers(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingBestSellers(false);
      });
    return () => { isMounted = false; };
  }, []);

  const goLogin = () => setPage("login");
  const goRegister = () => setPage("register");

  // Fallback to top products if best sellers is empty
  const displayBestSellers = useMemo(() => {
    if (bestSellers.length > 0) return bestSellers;
    return (products || []).slice(0, 10).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      image_url: p.image_url,
      total_sold: 0,
    }));
  }, [bestSellers, products]);

  // Infinite marquee sequence for right-to-left moving animation
  const marqueeBestSellers = useMemo(() => {
    if (displayBestSellers.length === 0) return [];
    let base = [...displayBestSellers];
    while (base.length < 5) {
      base = [...base, ...displayBestSellers];
    }
    return [...base, ...base];
  }, [displayBestSellers]);

  if (page === "login") return <LoginPage onLogin={onLogin} onBack={() => setPage("home")} onGoRegister={goRegister} />;
  if (page === "register") return <RegisterPage onLogin={onLogin} onBack={() => setPage("home")} onGoLogin={goLogin} />;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col scroll-smooth selection:bg-emerald-500 selection:text-white relative overflow-x-hidden transition-colors">

      {/* ── Ambient Background Glows ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-emerald-500/10 dark:from-emerald-500/15 via-teal-500/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[800px] -right-40 w-[600px] h-[600px] bg-emerald-600/5 dark:bg-emerald-600/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-[1800px] -left-40 w-[600px] h-[600px] bg-teal-600/5 dark:bg-teal-600/10 blur-[160px] pointer-events-none rounded-full" />

      {/* ── Frosted Glass Navbar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.3)] ring-1 ring-emerald-500/30 shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-black text-foreground text-xl tracking-tight flex items-center gap-1.5">
                SmartMart <span className="text-emerald-500 font-extrabold text-sm">●</span>
              </span>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase hidden sm:block">
                Neighborhood Store
              </p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs uppercase font-extrabold tracking-wider text-muted-foreground">
            <a href="#bestsellers" className="hover:text-emerald-500 transition-colors">Best Sellers</a>
            <a href="#features" className="hover:text-emerald-500 transition-colors">Why SmartMart</a>
            <a href="#how-it-works" className="hover:text-emerald-500 transition-colors">How It Works</a>
            <a href="#store-info" className="hover:text-emerald-500 transition-colors">Store Info</a>
          </nav>

          {/* Right Status & CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Store Beacon */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Open In-Store
            </div>

            <ThemeToggle />

            <button
              onClick={goLogin}
              className="text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl hover:bg-muted transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={goRegister}
              className="group text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-4 sm:px-5 py-2.5 rounded-xl shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.55)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Register</span>
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero & Best Sellers Spotlight Section ── */}
      <section id="bestsellers" className="relative pt-12 pb-20 px-5 sm:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

            {/* Left Column: Headline & Value Prop */}
            <div className="lg:col-span-5 flex flex-col justify-center text-left space-y-7">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-5 backdrop-blur-md shadow-sm">
                  <Sparkles size={13} className="text-emerald-500 animate-pulse" />
                  Smart Retail Experience
                </div>
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.08] tracking-tight text-foreground">
                  Your Local Store,<br />
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600 dark:from-emerald-400 dark:via-teal-300 dark:to-green-300 bg-clip-text text-transparent">
                    Smarter & Digital.
                  </span>
                </h1>
                <p className="mt-5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Never make an empty grocery trip again. Check in-store best sellers, track daily promotions, and automatically sync your purchase history with cashier POS.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5">
                <a
                  href="#features"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.55)] transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>Explore Features</span>
                  <ArrowDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                </a>
                <button
                  onClick={goRegister}
                  className="px-6 py-3.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border hover:border-emerald-500/40 font-bold text-sm shadow-sm transition-all cursor-pointer"
                >
                  Join as Customer
                </button>
              </div>

              {/* 3 Live Stat Pillars */}
              <div className="pt-6 border-t border-border grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-xl sm:text-2xl">
                    <Package size={18} />
                    <span>{(products || []).length > 0 ? `${(products || []).length}+` : "34+"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold mt-0.5">Live Products</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-black text-xl sm:text-2xl">
                    <Zap size={18} />
                    <span>Real-Time</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold mt-0.5">Stock Accuracy</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-300 font-black text-xl sm:text-2xl">
                    <Receipt size={18} />
                    <span>Instant</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold mt-0.5">POS Sync</span>
                </div>
              </div>
            </div>

            {/* Right Column: Best-Sellers Moving Showcase (Right to Left Animation) */}
            <div className="lg:col-span-7">
              <div className="relative rounded-3xl bg-card border border-border p-6 sm:p-7 shadow-xl overflow-hidden">
                
                {/* Header with Live Beacon */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full mb-1">
                      <Flame size={12} className="text-amber-500 fill-amber-500" />
                      In-Store Spotlight
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      Best-Selling Products
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Auto-scrolling • Hover to pause</span>
                  </div>
                </div>

                {/* Left & Right Edge Vignette Fades */}
                <div className="pointer-events-none absolute left-0 top-[110px] bottom-0 w-10 sm:w-16 bg-gradient-to-r from-card via-card/80 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-[110px] bottom-0 w-10 sm:w-16 bg-gradient-to-l from-card via-card/80 to-transparent z-10" />

                {/* Marquee Track Moving Right to Left */}
                {loadingBestSellers && displayBestSellers.length === 0 ? (
                  <div className="flex gap-4 overflow-hidden py-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-[210px] sm:w-[230px] shrink-0 bg-muted/40 rounded-2xl p-4 border border-border animate-pulse space-y-3">
                        <div className="aspect-[4/3] bg-muted rounded-xl"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden w-full relative py-2">
                    <div className="flex gap-4 animate-marquee-left hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] w-max select-none cursor-pointer">
                      {marqueeBestSellers.map((item, idx) => {
                        const rank = (idx % (displayBestSellers.length || 1)) + 1;
                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className="w-[210px] sm:w-[230px] shrink-0 group relative rounded-2xl bg-card hover:bg-card/90 border border-border hover:border-emerald-500/50 p-3.5 sm:p-4 transition-all duration-300 shadow-md hover:shadow-emerald-500/20 flex flex-col justify-between"
                          >
                            {/* Rank Badge */}
                            <div className="absolute top-3 left-3 z-10">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md shadow ${
                                rank === 1
                                  ? "bg-amber-400 text-slate-950 ring-1 ring-amber-300 font-black"
                                  : rank === 2
                                  ? "bg-slate-200 text-slate-900 font-black"
                                  : rank === 3
                                  ? "bg-amber-600 text-white font-black"
                                  : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 font-black"
                              }`}>
                                <Award size={11} /> #{rank}
                              </span>
                            </div>

                            {/* Studio-Grade Product Showcase Plate */}
                            <div className="aspect-[4/3] w-full rounded-xl bg-muted/40 p-3 flex items-center justify-center relative overflow-hidden shadow-inner group-hover:bg-muted/70 transition-all mb-3 mt-4">
                              {item.image_url ? (
                                <img
                                  src={getProductImageUrl(item.image_url) || ""}
                                  alt={item.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                                  onError={(e) => { (e.target as any).style.display = "none"; }}
                                />
                              ) : (
                                <Package size={36} className="text-muted-foreground group-hover:scale-110 transition-transform" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                  {item.category || "General"}
                                </span>
                                <h3 className="font-extrabold text-foreground text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-emerald-500 transition-colors mt-0.5">
                                  {item.name}
                                </h3>
                              </div>

                              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between gap-1">
                                <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                  {peso(item.price)}
                                </span>
                                {Number(item.total_sold) > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                    <Flame size={10} className="text-amber-500 fill-amber-500" />
                                    {item.total_sold} sold
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    Stock: {item.stock}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ── Why Choose SmartMart (Benefits with Glassmorphic Cards) ── */}
      <section id="features" className="py-24 px-5 sm:px-8 relative border-t border-border bg-background transition-colors">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Star size={13} />
              The SmartMart Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Why Shop With SmartMart?
            </h2>
            <p className="text-muted-foreground text-sm">
              We bring modern convenience store management and retail technology together for a seamless shopping experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Package size={24} className="text-emerald-500" />,
                title: "Live Inventory Status",
                desc: "Check product availability and prices before heading out so you never waste a trip.",
                color: "from-emerald-500/20 to-teal-500/5",
              },
              {
                icon: <Zap size={24} className="text-amber-500" />,
                title: "Rapid Counter POS",
                desc: "Speed through the cashier counter with barcode scanning and computerized receipt processing.",
                color: "from-amber-500/20 to-yellow-500/5",
              },
              {
                icon: <TrendingUp size={24} className="text-purple-500" />,
                title: "Personalized Analytics",
                desc: "Customers get interactive monthly spending charts, top purchases, and budget tracking.",
                color: "from-purple-500/20 to-indigo-500/5",
              },
              {
                icon: <RotateCcw size={24} className="text-blue-500" />,
                title: "Streamlined Returns",
                desc: "Transparent return requests with automated inventory restocking and digital audit trail.",
                color: "from-blue-500/20 to-cyan-500/5",
              },
            ].map(card => (
              <div
                key={card.title}
                className="group relative rounded-3xl bg-card hover:bg-muted/40 border border-border hover:border-emerald-500/40 p-7 transition-all duration-300 shadow-md flex flex-col justify-between"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} border border-border flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground group-hover:text-emerald-500 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                    {card.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── How It Works (Connected Step Pathway) ── */}
      <section id="how-it-works" className="py-24 px-5 sm:px-8 relative border-t border-border bg-muted/20 transition-colors">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Simple 4 Steps
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              How SmartMart Works
            </h2>
            <p className="text-muted-foreground text-sm">
              From online shelf browsing to in-store counter checkout in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              {
                step: "01",
                title: "Register Free",
                desc: "Sign up in 30 seconds to get your personal shopper ID and spending dashboard.",
              },
              {
                step: "02",
                title: "Check Live Shelf",
                desc: "Search our 34+ items to verify stock availability and current store prices.",
              },
              {
                step: "03",
                title: "In-Store Checkout",
                desc: "Present your name or items at counter; our cashier processes your POS receipt.",
              },
              {
                step: "04",
                title: "Digital Receipt Sync",
                desc: "View itemized receipts, monthly spending analytics, and return records anytime.",
              },
            ].map(item => (
              <div
                key={item.step}
                className="rounded-3xl bg-card border border-border p-6 space-y-4 hover:border-emerald-500/40 transition-all relative overflow-hidden group shadow-sm"
              >
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">
                  {item.step}
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Banner Call-to-Action */}
          <div className="mt-16 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-8 sm:p-10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden text-white">
            <div className="space-y-1.5 text-center sm:text-left z-10">
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Ready to Upgrade Your Shopping?
              </h3>
              <p className="text-emerald-100 text-xs sm:text-sm max-w-md">
                Join our neighborhood customer network today. Free registration with instant account activation.
              </p>
            </div>
            <button
              onClick={goRegister}
              className="px-8 py-3.5 rounded-xl bg-white text-slate-900 font-black text-sm shadow-xl hover:bg-emerald-50 hover:scale-105 transition-all shrink-0 z-10 cursor-pointer"
            >
              Get Started Now
            </button>
          </div>

        </div>
      </section>

      {/* ── Store Information & Operating Hours ── */}
      <section id="store-info" className="py-20 px-5 sm:px-8 relative border-t border-border bg-background transition-colors">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Visit Us In-Person
            </span>
            <h2 className="text-3xl font-black text-foreground tracking-tight">
              Store Information & Location
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-card border border-border p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Physical Address</p>
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line font-medium">
                {storeInfo.address}
              </p>
            </div>

            <div className="rounded-2xl bg-card border border-border p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Contact & Support</p>
              <p className="text-sm text-foreground/85 leading-relaxed font-medium">
                Phone: {storeInfo.contact}<br />
                Email: {storeInfo.email}
              </p>
            </div>

            <div className="rounded-2xl bg-card border border-border p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Store Hours</p>
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line font-medium">
                Monday – Sunday<br />
                {storeInfo.hours}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-card dark:bg-[#070a11] pt-12 pb-8 px-5 sm:px-8 border-t border-border transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 pb-8 border-b border-border">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
                  <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-black text-foreground text-lg tracking-tight">SmartMart</span>
              </div>
              <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
                Smart convenience store point of sale, real-time inventory tracking, and retail analytics platform.
              </p>
            </div>

            <div className="flex flex-wrap gap-12">
              <div>
                <p className="text-foreground font-extrabold text-xs uppercase tracking-widest mb-3">Quick Links</p>
                <div className="flex flex-col gap-2">
                  {[["Best Sellers", "#bestsellers"], ["Why SmartMart", "#features"], ["How It Works", "#how-it-works"], ["Store Info", "#store-info"]].map(([l, h]) => (
                    <a key={l} href={h} className="text-muted-foreground hover:text-emerald-500 text-xs transition-colors font-medium">{l}</a>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-foreground font-extrabold text-xs uppercase tracking-widest mb-3">Legal</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setLegalModal("privacy")} className="text-muted-foreground hover:text-emerald-500 text-xs transition-colors text-left font-medium cursor-pointer">Privacy Policy</button>
                  <button onClick={() => setLegalModal("terms")} className="text-muted-foreground hover:text-emerald-500 text-xs transition-colors text-left font-medium cursor-pointer">Terms & Conditions</button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-muted-foreground text-xs mt-6">
            © 2026 SmartMart. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Legal Modals ── */}
      {legalModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border text-foreground rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-extrabold text-lg text-foreground">
                {legalModal === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
              </h2>
              <button onClick={() => setLegalModal(null)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
              {legalModal === "privacy" ? (
                <>
                  <p>SmartMart ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our convenience store management system.</p>
                  <h3 className="font-extrabold text-foreground text-sm">1. Information We Collect</h3>
                  <p>We collect information you provide directly, such as your name, email address, phone number, and purchase history when you register and use our platform.</p>
                  <h3 className="font-extrabold text-foreground text-sm">2. How We Use Your Information</h3>
                  <p>Your information is used to manage your account, process transactions, and improve our services. We do not sell or share your personal data with third parties.</p>
                  <h3 className="font-extrabold text-foreground text-sm">3. Data Security</h3>
                  <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, or disclosure.</p>
                  <h3 className="font-extrabold text-foreground text-sm">4. Your Rights</h3>
                  <p>You have the right to access, correct, or request deletion of your personal data. Contact us at {storeInfo.email} for any privacy-related concerns.</p>
                  <h3 className="font-extrabold text-foreground text-sm">5. Contact Us</h3>
                  <p>For questions about this Privacy Policy, reach us at {storeInfo.address} or call {storeInfo.contact}.</p>
                </>
              ) : (
                <>
                  <p>By accessing or using SmartMart's platform, you agree to be bound by these Terms & Conditions. Please read them carefully before using our services.</p>
                  <h3 className="font-extrabold text-foreground text-sm">1. Use of Service</h3>
                  <p>SmartMart is a convenience store management system. Access is granted by role (Admin, Staff, or Customer) and must not be shared or misused.</p>
                  <h3 className="font-extrabold text-foreground text-sm">2. Account Responsibility</h3>
                  <p>You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.</p>
                  <h3 className="font-extrabold text-foreground text-sm">3. Purchases & Transactions</h3>
                  <p>All sales made through the POS system are final. Refunds or disputes must be raised directly at the store within 24 hours of the transaction.</p>
                  <h3 className="font-extrabold text-foreground text-sm">4. Prohibited Activities</h3>
                  <p>Users may not attempt to access unauthorized areas of the system, manipulate inventory data, or use the platform for any unlawful purpose.</p>
                  <h3 className="font-extrabold text-foreground text-sm">5. Changes to Terms</h3>
                  <p>SmartMart reserves the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.</p>
                  <h3 className="font-extrabold text-foreground text-sm">6. Contact</h3>
                  <p>For questions, contact us at {storeInfo.address} or call {storeInfo.contact}.</p>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => setLegalModal(null)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function LowStockModal({ items, onClose }: { items: Product[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const cats = Array.from(new Set(items.map(p => p.category))).sort();
  const filtered = items.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === "All" || p.category === catFilter;
    return ms && mc;
  });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-foreground text-lg leading-tight">Low Stock Alerts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{items.length} products need restocking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        {/* Filters */}
        <div className="px-6 py-4 border-b border-border shrink-0 flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search low stock items..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          >
            <option value="All">All Categories</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No items match your filter.</p>
          ) : filtered.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/15 hover:border-rose-500/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${CAT_COLORS[p.category] ?? "bg-muted text-muted-foreground"}`}>{p.category}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold text-rose-500 leading-tight" style={{ fontFamily: "'DM Mono', monospace" }}>{p.stock}</p>
                <p className="text-[10px] text-rose-500/70 font-semibold uppercase tracking-wide">units left</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between bg-muted/30">
          <p className="text-xs text-muted-foreground font-semibold">Showing {filtered.length} of {items.length} low stock items</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-foreground text-background text-sm font-bold rounded-xl hover:opacity-90 transition-opacity">Close</button>
        </div>
      </div>
    </div>
  );
}

function TransactionsModal({ transactions, onClose }: { transactions: Transaction[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = transactions.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.customer.toLowerCase().includes(search.toLowerCase()) ||
    t.cashier.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Receipt size={18} className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-foreground text-lg leading-tight">All Transactions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{transactions.length} transactions recorded</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        {/* Search */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by receipt ID, customer, or cashier..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
            />
          </div>
        </div>
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                <th className="text-left px-6 py-3">Receipt</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Cashier</th>
                <th className="text-left px-6 py-3">Items</th>
                <th className="text-right px-6 py-3">Total</th>
                <th className="text-right px-6 py-3">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">No transactions match your search.</td>
                </tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-blue-500 font-bold">{t.id}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-[11px] font-extrabold text-emerald-500 shrink-0">
                        {t.customer === "Walk-in" ? "?" : t.customer[0]}
                      </div>
                      <span className="text-foreground font-medium">{t.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">{t.cashier}</td>
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">{t.items.length} item{t.items.length !== 1 ? "s" : ""}</td>
                  <td className="px-6 py-3.5 text-right font-extrabold text-emerald-500" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(t.total)}</td>
                  <td className="px-6 py-3.5 text-right text-xs text-muted-foreground">{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between bg-muted/30">
          <p className="text-xs text-muted-foreground font-semibold">Showing {filtered.length} of {transactions.length} transactions</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-foreground text-background text-sm font-bold rounded-xl hover:opacity-90 transition-opacity">Close</button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ products, categories = CATEGORIES }: { products: Product[]; categories?: string[] }) {
  const [chartTab, setChartTab] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        const [sumRes, txRes] = await Promise.allSettled([
          api.dashboard.getSummary(),
          api.transactions.getAll(),
        ]);
        if (!isMounted) return;
        if (sumRes.status === "fulfilled") setSummary(sumRes.value);
        if (txRes.status === "fulfilled") setTransactions(txRes.value);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      }
    }
    loadDashboardData();
    return () => { isMounted = false; };
  }, []);

  const lowStock = products.filter(p => p.lowStock);
  const todayTotal = summary ? Number(summary.today_sales || 0) : 0;
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const chartData = useMemo(() => {
    if (chartTab === "daily") {
      // 12AM - 12PM / 24-hour cycle: 12AM, 2AM, 4AM, 6AM, 8AM, 10AM, 12PM, 2PM, 4PM, 6PM, 8PM, 10PM
      const slots = ["12AM", "2AM", "4AM", "6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM"];
      const map: Record<string, number> = Object.fromEntries(slots.map(s => [s, 0]));

      const todayDate = new Date();
      const todayYear = todayDate.getFullYear();
      const todayMonth = todayDate.getMonth();
      const todayDay = todayDate.getDate();

      const todayTxs = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d.getFullYear() === todayYear && d.getMonth() === todayMonth && d.getDate() === todayDay;
      });
      const txsToUse = todayTxs.length > 0 ? todayTxs : transactions;

      txsToUse.forEach(t => {
        if (!t.date) return;
        const dateObj = new Date(t.date);
        if (isNaN(dateObj.getTime())) return;
        const hour = dateObj.getHours(); // 0..23
        const slotIdx = Math.min(slots.length - 1, Math.floor(hour / 2));
        const slot = slots[slotIdx];
        map[slot] = (map[slot] || 0) + Number(t.total_amount || 0);
      });

      return slots.map(label => ({ label, value: map[label] || 0 }));
    }

    if (chartTab === "weekly") {
      // Monday to Sunday in exact sequence
      const slots = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const map: Record<string, number> = Object.fromEntries(slots.map(s => [s, 0]));

      transactions.forEach(t => {
        if (!t.date) return;
        const dateObj = new Date(t.date);
        if (isNaN(dateObj.getTime())) return;
        const dayIdx = (dateObj.getDay() + 6) % 7; // 0=Mon, 1=Tue, ..., 6=Sun
        const slot = slots[dayIdx];
        map[slot] = (map[slot] || 0) + Number(t.total_amount || 0);
      });

      return slots.map(label => ({ label, value: map[label] || 0 }));
    }

    if (chartTab === "monthly") {
      // January to December in exact sequence
      const slots = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const map: Record<string, number> = Object.fromEntries(slots.map(s => [s, 0]));

      transactions.forEach(t => {
        if (!t.date) return;
        const dateObj = new Date(t.date);
        if (isNaN(dateObj.getTime())) return;
        const m = dateObj.getMonth(); // 0..11
        const slot = slots[m];
        if (slot) {
          map[slot] = (map[slot] || 0) + Number(t.total_amount || 0);
        }
      });

      return slots.map(label => ({ label, value: map[label] || 0 }));
    }

    // Yearly: 2026 to 2030
    const slots = ["2026", "2027", "2028", "2029", "2030"];
    const map: Record<string, number> = Object.fromEntries(slots.map(s => [s, 0]));

    transactions.forEach(t => {
      if (!t.date) return;
      const dateObj = new Date(t.date);
      if (isNaN(dateObj.getTime())) return;
      const yr = String(dateObj.getFullYear());
      if (yr in map) {
        map[yr] = (map[yr] || 0) + Number(t.total_amount || 0);
      }
    });

    return slots.map(label => ({ label, value: map[label] || 0 }));
  }, [transactions, chartTab]);

  const totalProductsCount = summary?.total_products ?? products.length;
  const totalCategoriesCount = summary?.total_categories ?? categories.length;
  const totalCustomersCount = summary?.total_customers ?? 0;
  const activeStaffCount = summary?.active_staff ?? 0;
  const lowStockCount = summary?.low_stock_count ?? lowStock.length;

  return (
    <div className="p-6 space-y-6 bg-background text-foreground min-h-full transition-colors">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border shadow-xs text-xs font-semibold text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Store Sync
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={<Package size={20} />} label="Total Products" value={totalProductsCount} sub={`${totalCategoriesCount} categories`} color="green" />
        <StatCard icon={<TrendingUp size={20} />} label="Today's Sales" value={peso(todayTotal)} sub={`${summary?.today_transactions ?? transactions.length} transactions`} color="blue" />
        <StatCard icon={<User size={20} />} label="Customers" value={totalCustomersCount} sub="Registered" color="amber" />
        <StatCard icon={<AlertTriangle size={20} />} label="Low Stock" value={lowStockCount} sub="Need restocking" color="red" />
        <StatCard icon={<Users size={20} />} label="Staff Members" value={activeStaffCount} sub="Active accounts" color="gray" />
      </div>

      {/* Chart + Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-foreground">Sales Overview</h3>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {(["daily", "weekly", "monthly", "yearly"] as const).map(tab => (
                <button key={tab} onClick={() => setChartTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${chartTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <SimpleBarChart
            data={chartData}
            height={200}
            customTicks={chartTab === "daily" ? [0, 100, 200, 500, 1000] : undefined}
          />
        </div>

        {/* Best Sellers */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="font-extrabold text-foreground">Best Selling Products</h3>
          </div>
          {(!summary?.best_sellers || summary.best_sellers.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                <TrendingUp size={20} />
              </div>
              <p className="text-sm font-bold text-foreground">No Items Sold Yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Best selling products will be tracked live here as POS sales occur.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.best_sellers.map((item, i) => (
                <div key={item.id || item.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${i === 0 ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                    i === 1 ? "bg-slate-500/20 text-slate-400 border border-slate-500/30" :
                      i === 2 ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" : "bg-muted text-muted-foreground"
                    }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{item.total_sold} {item.total_sold === 1 ? "unit" : "units"} sold</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-500 font-mono shrink-0">
                    {peso(Number(item.total_revenue))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Low Stock */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" />
              <h3 className="font-extrabold text-foreground">Low Stock Alerts</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full">{lowStock.length} items</span>
            </div>
          </div>
          <div className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All products are well stocked.</p>
            ) : lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <span className="text-sm font-extrabold text-rose-500 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-blue-500" />
              <h3 className="font-extrabold text-foreground">Recent Transactions</h3>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No recent transactions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground font-semibold uppercase tracking-wide border-b border-border/50">
                    <th className="text-left pb-2">Receipt</th>
                    <th className="text-left pb-2">Customer</th>
                    <th className="text-left pb-2">Cashier</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 font-mono text-xs text-blue-500">{t.receipt_no || `TRX-${t.id}`}</td>
                      <td className="py-2.5 text-foreground font-medium">{t.customer || "Walk-in"}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{t.cashier || "Staff"}</td>
                      <td className="py-2.5 text-right font-extrabold text-emerald-500" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Products Page ────────────────────────────────────────────────────────────

function ProductsPage({ products, categories = CATEGORIES, onAddProduct }: { products: Product[]; categories?: string[]; onAddProduct: (p: Omit<Product, "id" | "lowStock">) => void }) {
  const { refreshData } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Add Product State
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newCat, setNewCat] = useState(categories[0]);
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Product State
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editCat, setEditCat] = useState(categories[0]);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [productMsg, setProductMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleOpenEdit = (p: Product) => {
    setEditProduct(p);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditStock(String(p.stock));
    setEditCat(p.category);
    setEditImageFile(null);
    setEditImagePreview(p.image_url ? getProductImageUrl(p.image_url) : null);
  };

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddImageFile(file);
      const url = URL.createObjectURL(file);
      setAddImagePreview(url);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const url = URL.createObjectURL(file);
      setEditImagePreview(url);
    }
  };

  const handleSubmitAdd = async () => {
    if (!newName.trim() || !newPrice || !newStock) return;
    const name = newName.trim();
    setIsAdding(true);
    try {
      const cats = await api.categories.getAll();
      const catObj = cats.find(c => c.name.toLowerCase() === newCat.toLowerCase());
      const catId = catObj ? catObj.id : 1;

      const created = await api.products.create({
        name,
        category_id: catId,
        price: parseFloat(newPrice),
        stock: parseInt(newStock),
      });

      const newId = (created as any)?.product_id || (created as any)?.id;
      if (addImageFile && newId) {
        await api.products.uploadImage(newId, addImageFile);
      }

      setProductMsg({ type: "success", text: `Product "${name}" added successfully!` });
      setTimeout(() => setProductMsg(null), 5000);
      setNewName(""); setNewPrice(""); setNewStock(""); setNewCat(categories[0]);
      setAddImageFile(null); setAddImagePreview(null);
      setShowAdd(false);
      await refreshData();
    } catch (err: any) {
      setProductMsg({ type: "error", text: err.message || "Failed to create product" });
      setTimeout(() => setProductMsg(null), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editProduct || !editName.trim() || !editPrice || !editStock) return;
    setIsSaving(true);
    try {
      const cats = await api.categories.getAll();
      const catObj = cats.find(c => c.name.toLowerCase() === editCat.toLowerCase());
      const catId = catObj ? catObj.id : (editProduct.category_id || 1);

      await api.products.update(editProduct.id, {
        name: editName.trim(),
        category_id: catId,
        price: parseFloat(editPrice),
        stock: parseInt(editStock),
        image_url: editProduct.image_url || null,
      });

      if (editImageFile) {
        await api.products.uploadImage(editProduct.id, editImageFile);
      }

      setProductMsg({ type: "success", text: `Product "${editName.trim()}" updated successfully!` });
      setTimeout(() => setProductMsg(null), 5000);
      setEditProduct(null);
      await refreshData();
    } catch (err: any) {
      setProductMsg({ type: "error", text: err.message || "Failed to update product" });
      setTimeout(() => setProductMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() =>
    products.filter(p => {
      const s = p.name.toLowerCase().includes(search.toLowerCase());
      const c = category === "All" || p.category === category;
      return s && c;
    }), [products, search, category]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Products</h1>
          <p className="text-muted-foreground text-sm">{products.length} total products</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {productMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${productMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {productMsg.type === "success" ? <CheckCircle size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
          {productMsg.text}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
          <option>All</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["Product", "Category", "Price", "Stock", "Status", "Actions"].map(h => (
                <th key={h} className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider ${h === "Price" ? "px-4 py-3 text-right" : h === "Stock" ? "px-4 py-3 text-center" : h === "Actions" ? "px-4 py-3 text-center" : "px-4 py-3 text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-foreground">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-border/50 ${CAT_BG[p.category] ?? "bg-muted"}`}>
                      {p.image_url ? (
                        <img src={getProductImageUrl(p.image_url) || ""} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-muted-foreground/60" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[240px]">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${CAT_COLORS[p.category] ?? "bg-muted text-foreground"}`}>{p.category}</span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(p.price)}</td>
                <td className={`px-4 py-3 text-center text-sm font-bold ${p.lowStock ? "text-red-500" : "text-foreground"}`} style={{ fontFamily: "'DM Mono', monospace" }}>{p.stock}</td>
                <td className="px-4 py-3 text-left">{p.lowStock ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">In Stock</Badge>}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-sm active:scale-95"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <Package size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No products match your search.</p>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <h3 className="font-extrabold text-lg text-foreground">Edit Product</h3>
              </div>
              <button onClick={() => setEditProduct(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* Product Image Section */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Product Image</label>
                <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border bg-background">
                  <div className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-border relative bg-muted/30`}>
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={30} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">
                      {editImageFile ? editImageFile.name : editProduct.image_url ? "Current image uploaded" : "No image uploaded yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, WEBP up to 5MB. Visible to Cashiers and Customers.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs">
                        <Upload size={13} /> {editProduct.image_url || editImageFile ? "Change Image" : "Upload Image"}
                        <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                      </label>
                      {editImageFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditImageFile(null);
                            setEditImagePreview(editProduct.image_url ? getProductImageUrl(editProduct.image_url) : null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancel File
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Product Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Piattos Cheese 85g" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Price (₱)</label>
                  <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="0.00" min="0" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Stock Quantity</label>
                  <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Category</label>
                <select value={editCat} onChange={e => setEditCat(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setEditProduct(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                <button type="button" onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                  {isSaving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <h3 className="font-extrabold text-lg text-foreground">Add New Product</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {/* Optional Image Upload */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Product Image (Optional)</label>
                <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border bg-background">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-border bg-muted/30">
                    {addImagePreview ? (
                      <img src={addImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={30} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">
                      {addImageFile ? addImageFile.name : "No image selected"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, WEBP up to 5MB.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs">
                        <Upload size={13} /> {addImageFile ? "Change Image" : "Upload Image"}
                        <input type="file" accept="image/*" onChange={handleAddImageChange} className="hidden" />
                      </label>
                      {addImageFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddImageFile(null);
                            setAddImagePreview(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Product Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Piattos Cheese 85g" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Price (₱)</label>
                  <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" min="0" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Stock Quantity</label>
                  <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Category</label>
                <select value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                <button type="button" onClick={handleSubmitAdd} disabled={isAdding} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                  {isAdding ? "Adding Product..." : "Add Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Page ───────────────────────────────────────────────────────────

function InventoryPage({ products, categories = CATEGORIES, catMeta = CAT_META }: { products: Product[]; categories?: string[]; catMeta?: CatMeta }) {
  const { refreshData } = useStore();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");

  // Restock modal states
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockCostPrice, setRestockCostPrice] = useState<string>("");
  const [restockQuantity, setRestockQuantity] = useState<string>("10");
  const [restockMarkup, setRestockMarkup] = useState<string>("10");
  const [restockSellingPrice, setRestockSellingPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lowCount = products.filter(p => p.lowStock).length;

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat === "All" || p.category === selectedCat;
    const mf = stockFilter === "all" || p.lowStock;
    return ms && mc && mf;
  });

  // Pricing helpers for Restock in Inventory
  const handleRestockCostChange = (val: string) => {
    setRestockCostPrice(val);
    const cost = parseFloat(val);
    const qty = parseInt(restockQuantity, 10) || 1;
    const markup = parseFloat(restockMarkup);
    if (!isNaN(cost) && cost > 0) {
      const unitCost = qty > 0 ? cost / qty : cost;
      const rate = !isNaN(markup) ? markup : 0;
      const autoPrice = (unitCost * (1 + rate / 100)).toFixed(2);
      setRestockSellingPrice(autoPrice);
    }
  };

  const handleRestockQuantityChange = (val: string) => {
    setRestockQuantity(val);
    const qty = parseInt(val, 10);
    const cost = parseFloat(restockCostPrice);
    const markup = parseFloat(restockMarkup);
    if (!isNaN(cost) && cost > 0 && !isNaN(qty) && qty > 0) {
      const unitCost = cost / qty;
      const rate = !isNaN(markup) ? markup : 0;
      const autoPrice = (unitCost * (1 + rate / 100)).toFixed(2);
      setRestockSellingPrice(autoPrice);
    }
  };

  const handleRestockMarkupChange = (val: string) => {
    setRestockMarkup(val);
    const cost = parseFloat(restockCostPrice);
    const qty = parseInt(restockQuantity, 10) || 1;
    const markup = parseFloat(val);
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      const unitCost = qty > 0 ? cost / qty : cost;
      const autoPrice = (unitCost * (1 + markup / 100)).toFixed(2);
      setRestockSellingPrice(autoPrice);
    }
  };

  const handleRestockMarkupPreset = (pct: number) => {
    setRestockMarkup(String(pct));
    const cost = parseFloat(restockCostPrice);
    const qty = parseInt(restockQuantity, 10) || 1;
    if (!isNaN(cost) && cost > 0) {
      const unitCost = qty > 0 ? cost / qty : cost;
      const autoPrice = (unitCost * (1 + pct / 100)).toFixed(2);
      setRestockSellingPrice(autoPrice);
    }
  };

  const handleRestockSellingPriceChange = (val: string) => {
    setRestockSellingPrice(val);
    const sell = parseFloat(val);
    const cost = parseFloat(restockCostPrice);
    const qty = parseInt(restockQuantity, 10) || 1;
    if (!isNaN(sell) && !isNaN(cost) && cost > 0) {
      const unitCost = qty > 0 ? cost / qty : cost;
      if (unitCost > 0) {
        const computedMarkup = (((sell - unitCost) / unitCost) * 100).toFixed(1);
        setRestockMarkup(computedMarkup.replace(/\.0$/, ""));
      }
    }
  };

  const handleOpenRestock = (p: Product) => {
    setRestockProduct(p);
    const defaultQty = "10";
    setRestockQuantity(defaultQty);
    setErrorMsg(null);

    const currentPrice = String(p.price);
    setRestockSellingPrice(currentPrice);

    const storedTotalCost = localStorage.getItem(`smartmart_product_total_cost_${p.id}`);
    const storedUnitCost = localStorage.getItem(`smartmart_product_cost_${p.id}`);
    let initialCost = "";
    if (storedTotalCost) {
      initialCost = storedTotalCost;
    } else if (p.cost_price != null || storedUnitCost) {
      const uCost = p.cost_price != null ? Number(p.cost_price) : Number(storedUnitCost);
      initialCost = String((uCost * 10).toFixed(2));
    }
    setRestockCostPrice(initialCost);

    const numCost = parseFloat(initialCost);
    const numSell = Number(p.price);
    const qty = parseInt(defaultQty, 10) || 1;
    const unitCost = !isNaN(numCost) && numCost > 0 ? numCost / qty : 0;
    if (unitCost > 0 && numSell > 0) {
      const computedMarkup = (((numSell - unitCost) / unitCost) * 100).toFixed(1);
      setRestockMarkup(computedMarkup.replace(/\.0$/, ""));
    } else {
      setRestockMarkup("10");
    }
  };

  const handleCloseRestock = () => {
    if (isSubmitting) return;
    setRestockProduct(null);
    setErrorMsg(null);
  };

  const handleConfirmRestock = async () => {
    if (!restockProduct) return;
    const qtyToAdd = parseInt(restockQuantity, 10);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      setErrorMsg("Please enter a valid stock quantity to add (at least 1).");
      return;
    }

    const newSellingPrice = parseFloat(restockSellingPrice);
    if (isNaN(newSellingPrice) || newSellingPrice < 0) {
      setErrorMsg("Please enter a valid selling price.");
      return;
    }

    const cost = parseFloat(restockCostPrice);
    const unitCost = !isNaN(cost) && cost > 0 ? (cost / qtyToAdd) : undefined;
    const newTotalStock = restockProduct.stock + qtyToAdd;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.products.update(restockProduct.id, {
        name: restockProduct.name,
        category_id: restockProduct.category_id || 1,
        price: newSellingPrice,
        cost_price: unitCost,
        stock: newTotalStock,
        image_url: restockProduct.image_url || null,
      });

      if (!isNaN(cost) && cost > 0) {
        localStorage.setItem(`smartmart_product_total_cost_${restockProduct.id}`, String(cost));
        if (unitCost != null) {
          localStorage.setItem(`smartmart_product_cost_${restockProduct.id}`, String(unitCost));
        }
      }

      toast.success(
        `Restocked "${restockProduct.name}" (+${qtyToAdd} units, selling price: ₱${newSellingPrice.toFixed(2)}). Total stock: ${newTotalStock}.`
      );
      await refreshData();
      handleCloseRestock();
    } catch (err: any) {
      const msg = err.message || "Failed to restock product.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Inventory</h1>
        <p className="text-muted-foreground text-sm">Monitor and restock product levels by category</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 text-center shadow-sm">
          <p className="text-3xl font-extrabold text-foreground">{products.length}</p>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Total Products</p>
        </div>
        <div className="bg-red-50/80 rounded-2xl border border-red-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-extrabold text-red-500">{lowCount}</p>
          <p className="text-sm text-red-600 mt-1 font-medium">Low Stock</p>
        </div>
        <div className="bg-green-50/80 rounded-2xl border border-green-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-extrabold text-[#22c55e]">{products.length - lowCount}</p>
          <p className="text-sm text-green-700 mt-1 font-medium">Well Stocked</p>
        </div>
      </div>

      {/* Search + category dropdown + stock filter */}
      <div className="flex gap-3 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search${selectedCat !== "All" ? ` in ${selectedCat}` : " all products"}...`}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30"
          />
        </div>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 cursor-pointer"
        >
          <option value="All">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
          className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all shrink-0 ${stockFilter === "low" ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-card text-muted-foreground border-border hover:border-gray-400"}`}
        >
          Low Stock
        </button>
      </div>

      {/* Product table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            {selectedCat === "All" ? "All Products" : (
              <span className="flex items-center gap-2">
                <span>{catMeta[selectedCat]?.emoji ?? "📦"}</span>
                {selectedCat}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">No products found.</td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${p.lowStock ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.lowStock && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedCat(p.category)}
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold hover:opacity-80 transition-opacity ${CAT_COLORS[p.category] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {p.category}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace", color: p.lowStock ? "#ef4444" : "#0f172a" }}>
                    {p.stock} units
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.lowStock ? <Badge variant="danger">Restock Needed</Badge> : <Badge variant="success">OK</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenRestock(p)}
                      className="px-3 py-1.5 text-xs font-bold text-[#22c55e] border border-[#22c55e] bg-white hover:bg-[#22c55e] hover:text-white rounded-lg transition-all shadow-sm flex items-center gap-1 ml-auto"
                    >
                      <Plus size={13} /> Restock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="font-extrabold text-foreground text-base leading-tight">Restock Product</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Update inventory stock level</p>
                </div>
              </div>
              <button
                onClick={handleCloseRestock}
                disabled={isSubmitting}
                className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Product Info Card */}
              <div className="p-3.5 bg-muted/40 rounded-2xl border border-border flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <p className="font-bold text-foreground text-sm truncate">{restockProduct.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${CAT_COLORS[restockProduct.category] ?? "bg-muted text-foreground"}`}>
                      {restockProduct.category}
                    </span>
                    {restockProduct.lowStock ? (
                      <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle size={11} /> Low Stock
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        Well Stocked
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 bg-card px-3 py-1.5 rounded-xl border border-border shadow-xs">
                  <span className="text-xs text-muted-foreground block font-medium">Current</span>
                  <span className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {restockProduct.stock} units
                  </span>
                </div>
              </div>

              {/* PRICING & MARGINS Card */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pricing & Margins</span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Selling price auto-calculates each
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        Cost Price (₱)
                      </label>
                      {parseFloat(restockCostPrice) > 0 && parseInt(restockQuantity, 10) > 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          = {peso(parseFloat(restockCostPrice) / (parseInt(restockQuantity, 10) || 1))}/ea
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={restockCostPrice}
                      onChange={e => handleRestockCostChange(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Stock Quantity</label>
                      {parseInt(restockQuantity, 10) > 0 && (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          New: <strong className="text-emerald-600 font-bold">{restockProduct.stock + (parseInt(restockQuantity, 10) || 0)}</strong>
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={restockQuantity}
                      onChange={e => handleRestockQuantityChange(e.target.value)}
                      placeholder="0"
                      min="1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Markup (%)</label>
                      <span className="text-[11px] text-muted-foreground">Quick presets:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        value={restockMarkup}
                        onChange={e => handleRestockMarkupChange(e.target.value)}
                        placeholder="10"
                        className="w-16 px-2.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-center font-bold"
                      />
                      <div className="flex items-center gap-1 flex-1 overflow-x-auto py-0.5">
                        {[5, 10, 15, 20, 25].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleRestockMarkupPreset(pct)}
                            className={`px-1.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                              parseFloat(restockMarkup) === pct
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-background border border-border hover:bg-muted text-foreground"
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1">
                        Selling Price (₱) <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">(EACH / UNIT)</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={restockSellingPrice}
                      onChange={e => handleRestockSellingPriceChange(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                {(() => {
                  const cost = parseFloat(restockCostPrice);
                  const qty = parseInt(restockQuantity, 10) || 1;
                  const sell = parseFloat(restockSellingPrice);
                  if (cost > 0 && sell > 0) {
                    const unitCost = qty > 0 ? cost / qty : cost;
                    const profitPerUnit = sell - unitCost;
                    const totalProfit = profitPerUnit * qty;
                    const markupPct = unitCost > 0 ? ((profitPerUnit / unitCost) * 100).toFixed(1) : "0";
                    return (
                      <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                        <span>Profit: <strong className="font-bold">+{peso(profitPerUnit)} each</strong> ({markupPct}%)</span>
                        <span className="text-[11px] opacity-90">Total profit: <strong className="font-bold">+{peso(totalProfit)}</strong> ({qty} units)</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-500 flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/40 flex gap-3">
              <button
                type="button"
                onClick={handleCloseRestock}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-border bg-card text-sm font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                disabled={isSubmitting || !restockQuantity || parseInt(restockQuantity, 10) <= 0 || !restockSellingPrice || parseFloat(restockSellingPrice) < 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} /> Confirm Restock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Staff Page ─────────────────────────────────────────────────────────

function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = () => {
    api.staff.getAll()
      .then(setStaffList)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credsMap, setCredsMap] = useState<Record<string, string>>({});
  const [viewingStaff, setViewingStaff] = useState<StaffItem | null>(null);
  const [showViewPw, setShowViewPw] = useState(false);

  // Reset Staff Password State
  const [resetStaffTarget, setResetStaffTarget] = useState<StaffItem | null>(null);
  const [resetStaffPw, setResetStaffPw] = useState("");
  const [showResetStaffPw, setShowResetStaffPw] = useState(false);
  const [isResettingStaff, setIsResettingStaff] = useState(false);
  const [resetStaffSuccessData, setResetStaffSuccessData] = useState<{ username: string; temp_password: string } | null>(null);
  const [copiedStaffPw, setCopiedStaffPw] = useState(false);
  const [latestResetMap, setLatestResetMap] = useState<Record<number, string>>({});

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const openResetStaffPassword = (s: StaffItem) => {
    setResetStaffTarget(s);
    setResetStaffPw(generateRandomPassword());
    setShowResetStaffPw(true);
    setResetStaffSuccessData(null);
    setCopiedStaffPw(false);
  };

  const handleResetStaffPassword = async () => {
    if (!resetStaffTarget) return;
    if (!resetStaffPw || resetStaffPw.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsResettingStaff(true);
    try {
      const cleanPw = resetStaffPw.trim();
      const res = await api.staff.resetPassword(resetStaffTarget.id, cleanPw);
      setLatestResetMap(prev => ({ ...prev, [resetStaffTarget.id]: cleanPw }));
      // Keep initial creation temp_password intact; only set if it didn't exist before
      if (!resetStaffTarget.temp_password) {
        const initialPw = res.initial_temp_password || cleanPw;
        setStaffList(prev => prev.map(s => s.id === resetStaffTarget.id ? { ...s, temp_password: initialPw } : s));
        if (viewingStaff && viewingStaff.id === resetStaffTarget.id) {
          setViewingStaff(prev => prev ? { ...prev, temp_password: initialPw } : null);
        }
      }
      setResetStaffSuccessData({ username: res.username || resetStaffTarget.username || "", temp_password: cleanPw });
      toast.success(`Password for ${resetStaffTarget.full_name} has been reset!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset staff password.");
    } finally {
      setIsResettingStaff(false);
    }
  };

  const copyStaffPwToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStaffPw(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopiedStaffPw(false), 2500);
  };

  const resetForm = () => { setNewName(""); setNewUsername(""); setNewPassword(""); setShowPassword(false); };
  const [staffMsg, setStaffMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submitStaff = async () => {
    const name = newName.trim();
    const username = newUsername.trim();
    if (!name || !username || !newPassword) return;

    try {
      const newStaff = await api.staff.create({ username, password: newPassword, full_name: name });
      setStaffList(prev => [...prev, newStaff]);
      setCredsMap(prev => ({ ...prev, [username]: newPassword }));
      resetForm();
      setShowAdd(false);
      setStaffMsg({ type: "success", text: `Account for "${name}" created successfully!` });
      setTimeout(() => setStaffMsg(null), 5000);
    } catch (err: any) {
      setStaffMsg({ type: "error", text: err.message || "Failed to create staff account." });
      setTimeout(() => setStaffMsg(null), 5000);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground text-sm">{staffList.length} staff accounts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Inline message */}
      {staffMsg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${staffMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {staffMsg.type === "success" ? <CheckCircle size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
          {staffMsg.text}
        </div>
      )}

      <div className="grid gap-4">
        {staffList.map(s => (
          <div key={s.id} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <span className="text-emerald-700 font-extrabold text-xl">{s.full_name?.charAt(0) || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">{s.full_name}</p>
                <Badge variant={s.status === "Active" ? "success" : "default"}>{s.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{s.username}</p>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>ID: {s.staff_code} · Joined: {s.joined}</p>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{s.role}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setViewingStaff(s); setShowViewPw(false); }}
                  className="px-4 py-2 text-xs font-bold rounded-xl border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-sm"
                >
                  View
                </button>
                <button
                  onClick={() => openResetStaffPassword(s)}
                  title="Reset staff password"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                >
                  Reset PW
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await api.staff.toggleStatus(s.id);
                      setStaffList(prev => prev.map(x => x.id === s.id ? { ...x, status: res.status } : x));
                    } catch (err: any) {
                      console.error(err);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all shadow-sm ${s.status === "Active" ? "border-amber-400 bg-amber-400 text-white hover:bg-amber-500 hover:border-amber-500" : "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600"}`}
                >
                  {s.status === "Active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg text-foreground">Add Staff Account</h3>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} type="text" placeholder="e.g. Maria Santos" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Username</label>
                <input value={newUsername} onChange={e => setNewUsername(e.target.value)} type="text" placeholder="e.g. mariasantos" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Temporary Password</label>
                <div className="relative">
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                <button onClick={submitStaff} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors">Create Account</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Credentials Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <User size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Staff Credentials</h3>
                  <p className="text-xs text-muted-foreground">{viewingStaff.full_name}</p>
                </div>
              </div>
              <button onClick={() => setViewingStaff(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Full Name</p>
                <p className="font-bold text-foreground">{viewingStaff.full_name}</p>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Staff Code</p>
                <p className="font-bold text-foreground font-mono">{viewingStaff.staff_code}</p>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Username</p>
                <p className="font-bold text-foreground font-mono">{viewingStaff.username}</p>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium">Temporary Password (Initial)</p>
                  <button
                    type="button"
                    onClick={() => openResetStaffPassword(viewingStaff)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors border border-amber-200"
                  >
                    Reset
                  </button>
                </div>
                {(viewingStaff.temp_password || (viewingStaff.username && credsMap[viewingStaff.username])) ? (
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground font-mono flex-1">
                      {showViewPw ? (viewingStaff.temp_password || credsMap[viewingStaff.username!]) : "••••••••"}
                    </p>
                    <button type="button" onClick={() => setShowViewPw(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {showViewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No temporary password recorded</p>
                )}
              </div>

              {latestResetMap[viewingStaff.id] && (
                <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Latest Reset Password (Active)</p>
                    <button
                      type="button"
                      onClick={() => copyStaffPwToClipboard(latestResetMap[viewingStaff.id])}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="font-bold text-foreground font-mono text-sm">
                    {latestResetMap[viewingStaff.id]}
                  </p>
                </div>
              )}
              <div className="p-4 bg-background rounded-xl border border-border flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Role</p>
                  <p className="font-semibold text-foreground text-sm">{viewingStaff.role}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                  <Badge variant={viewingStaff.status === "Active" ? "success" : "default"}>{viewingStaff.status}</Badge>
                </div>
              </div>
              <div className="pt-2">
                <button onClick={() => setViewingStaff(null)} className="w-full py-2.5 rounded-xl bg-[#1f2937] text-white text-sm font-bold hover:bg-[#374151] transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Staff Password Modal */}
      {resetStaffTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Reset Password</h3>
                  <p className="text-xs text-muted-foreground">{resetStaffTarget.full_name} (@{resetStaffTarget.username})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetStaffTarget(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {resetStaffSuccessData ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Check size={22} className="stroke-[3]" />
                  </div>
                  <h4 className="font-extrabold text-foreground text-sm">Password Reset Successful!</h4>
                  <p className="text-xs text-muted-foreground">
                    The staff account password for <span className="font-bold text-foreground">@{resetStaffSuccessData.username}</span> has been updated. Please share the new credentials with the staff member:
                  </p>
                </div>

                <div className="p-3.5 bg-background rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Temporary Password</span>
                    <button
                      type="button"
                      onClick={() => copyStaffPwToClipboard(resetStaffSuccessData.temp_password)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {copiedStaffPw ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedStaffPw ? "Copied!" : "Copy Password"}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-muted/60 rounded-lg font-mono text-center font-bold text-base text-foreground tracking-wider select-all border border-border">
                    {resetStaffSuccessData.temp_password}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground italic text-center">
                  The staff member can immediately log into the POS or Staff Portal with this new password.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStaffTarget(null)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">{resetStaffTarget.full_name?.charAt(0) || "S"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium">Staff Account ({resetStaffTarget.role})</p>
                    <p className="text-sm font-bold text-foreground truncate">{resetStaffTarget.full_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">@{resetStaffTarget.username} · {resetStaffTarget.staff_code}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground">
                      New Temporary Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetStaffPw(generateRandomPassword())}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Generate New
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showResetStaffPw ? "text" : "password"}
                      value={resetStaffPw}
                      onChange={e => setResetStaffPw(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background font-mono text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetStaffPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showResetStaffPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Enter or generate a new password (min. 6 characters). This will update their login credentials and the temporary password on file.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setResetStaffTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-bold text-xs hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isResettingStaff || !resetStaffPw.trim() || resetStaffPw.trim().length < 6}
                    onClick={handleResetStaffPassword}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isResettingStaff ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      "Confirm Reset"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customers Page ───────────────────────────────────────────────────────────

function CustomersPage() {
  const { pendingCustomers, registeredCustomers, approvePendingCustomer, denyPendingCustomer, refreshData } = useStore();
  const [tab, setTab] = useState<"registered" | "pending">("registered");
  const [approveTarget, setApproveTarget] = useState<PendingCustomer | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [customerMsg, setCustomerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<RegisteredCustomer | null>(null);
  const [showViewCustPw, setShowViewCustPw] = useState(false);
  const [custCredsMap, setCustCredsMap] = useState<Record<string, string>>({});

  // Reset Password Modal State
  const [resetTarget, setResetTarget] = useState<RegisteredCustomer | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{ username: string; temp_password: string } | null>(null);
  const [copiedPw, setCopiedPw] = useState(false);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const openResetPassword = (c: RegisteredCustomer) => {
    setResetTarget(c);
    setResetPw(generateRandomPassword());
    setShowResetPw(true);
    setResetSuccessData(null);
    setCopiedPw(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!resetPw || resetPw.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsResetting(true);
    try {
      const cleanPw = resetPw.trim();
      const res = await api.customers.resetPassword(resetTarget.id, cleanPw);
      setCustCredsMap(prev => ({ ...prev, [resetTarget.username]: res.temp_password }));
      if (viewingCustomer && viewingCustomer.id === resetTarget.id) {
        setViewingCustomer(prev => prev ? { ...prev, temp_password: res.temp_password } : null);
      }
      setResetSuccessData({ username: resetTarget.username, temp_password: res.temp_password });
      toast.success(`Password for ${resetTarget.full_name} (@${resetTarget.username}) has been reset!`);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset customer password.");
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPw(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopiedPw(false), 2500);
  };

  // Customer discount editing in admin view
  const [editingCustDiscount, setEditingCustDiscount] = useState(false);
  const [custDiscountType, setCustDiscountType] = useState<"None" | "Senior Citizen" | "PWD">("None");
  const [custDiscountId, setCustDiscountId] = useState("");
  const [savingCustDiscount, setSavingCustDiscount] = useState(false);

  const openViewingCustomer = (c: RegisteredCustomer) => {
    setViewingCustomer(c);
    setShowViewCustPw(false);
    setEditingCustDiscount(false);
    setCustDiscountType((c.discount_type as any) || "None");
    setCustDiscountId(c.discount_id_no || "");
  };

  const handleSaveCustomerDiscount = async () => {
    if (!viewingCustomer) return;
    if (custDiscountType !== "None" && !custDiscountId.trim()) {
      toast.error(`${custDiscountType} ID number is required.`);
      return;
    }
    setSavingCustDiscount(true);
    try {
      await api.customers.updateDiscount(viewingCustomer.id, {
        discount_type: custDiscountType,
        discount_id_no: custDiscountType !== "None" ? custDiscountId.trim() : null,
      });
      const updated = {
        ...viewingCustomer,
        discount_type: custDiscountType,
        discount_id_no: custDiscountType !== "None" ? custDiscountId.trim() : null,
      };
      setViewingCustomer(updated);
      setEditingCustDiscount(false);
      toast.success("Customer discount status updated successfully!");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update discount status.");
    } finally {
      setSavingCustDiscount(false);
    }
  };

  const handleApprove = async () => {
    if (!newEmail.trim()) { toast.error("Please enter a username."); return; }
    if (!newPw.trim()) { toast.error("Please enter a temporary password."); return; }
    try {
      const targetName = `${approveTarget!.firstName} ${approveTarget!.lastName}`;
      const username = newEmail;
      await approvePendingCustomer(approveTarget!.id, newEmail, newPw);
      setCustCredsMap(prev => ({ ...prev, [username]: newPw }));
      setCustomerMsg({
        type: "success",
        text: `Customer account for "${targetName}" (@${username}) was created successfully!`,
      });
      setTimeout(() => setCustomerMsg(null), 6000);
      setApproveTarget(null);
      setNewEmail(""); setNewPw("");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve customer account.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Customer Accounts</h1>
          <p className="text-muted-foreground text-sm">{registeredCustomers.length} registered · {pendingCustomers.length} pending</p>
        </div>
      </div>

      {customerMsg && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${customerMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {customerMsg.type === "success" ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
          {customerMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab("registered")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === "registered" ? "border-[#22c55e] text-[#22c55e]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Registered <span className="bg-emerald-100 text-emerald-700 text-xs font-extrabold px-2 py-0.5 rounded-full">{registeredCustomers.length}</span>
        </button>
        <button onClick={() => setTab("pending")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === "pending" ? "border-amber-500 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Pending Approval
          {pendingCustomers.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-extrabold px-2 py-0.5 rounded-full">{pendingCustomers.length}</span>}
        </button>
      </div>

      {/* Registered tab */}
      {tab === "registered" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Code</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchases</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Since</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registeredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <span className="text-purple-700 font-bold text-sm">{c.full_name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">{c.full_name}</p>
                          {(c.discount_type === "Senior Citizen" || c.discount_type === "PWD") && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                              {c.discount_type === "Senior Citizen" ? "Senior" : "PWD"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">@{c.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.phone}</td>
                  <td className="px-4 py-3"><Badge variant="info">{c.customer_code}</Badge></td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.total_purchases}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.joined}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openViewingCustomer(c)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openResetPassword(c)}
                        title="Reset customer password"
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                      >
                        Reset PW
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {registeredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No approved customer accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending tab */}
      {tab === "pending" && (
        <div className="space-y-3">
          {pendingCustomers.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-16 text-center text-muted-foreground text-sm">
              No pending registrations.
            </div>
          ) : (
            pendingCustomers.map(c => (
              <div key={c.id} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-amber-700 font-extrabold text-lg">{c.firstName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground text-xs">Full Name</span><p className="font-bold text-foreground">{c.lastName}, {c.firstName} {c.middleName}</p></div>
                  <div><span className="text-muted-foreground text-xs">Phone</span><p className="font-semibold text-foreground">{c.phone}</p></div>
                  <div><span className="text-muted-foreground text-xs">Address</span><p className="font-semibold text-foreground truncate">{c.address}</p></div>
                  <div><span className="text-muted-foreground text-xs">Date of Birth</span><p className="font-semibold text-foreground">{c.dob}</p></div>
                  <div><span className="text-muted-foreground text-xs">Gender</span><p className="font-semibold text-foreground">{c.gender}</p></div>
                  <div><span className="text-muted-foreground text-xs">Civil Status</span><p className="font-semibold text-foreground">{c.status}</p></div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Submitted {c.submittedAt}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { denyPendingCustomer(c.id); toast.success("Registration denied."); }} className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-red-400 bg-red-400 text-white hover:bg-red-500 hover:border-red-500 transition-all">Deny</button>
                    <button onClick={() => setApproveTarget(c)} className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 transition-all">Approve</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg text-foreground">Create Account Credentials</h3>
              <button onClick={() => setApproveTarget(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 mb-5 text-sm">
              <p className="font-extrabold text-foreground">{approveTarget.lastName}, {approveTarget.firstName} {approveTarget.middleName}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{approveTarget.phone} · {approveTarget.address}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Assign Username</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="text" placeholder="e.g. juan.delacruz" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Temporary Password</label>
                <div className="relative">
                  <input value={newPw} onChange={e => setNewPw(e.target.value)} type={showPw ? "text" : "password"} placeholder="••••••••" className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Give these credentials to the customer when they visit the store.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setApproveTarget(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleApprove} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors">Approve & Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Credentials Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <User size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Customer Credentials</h3>
                  <p className="text-xs text-muted-foreground">{viewingCustomer.full_name}</p>
                </div>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3.5 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Full Name</p>
                  <p className="font-bold text-foreground text-sm">{viewingCustomer.full_name}</p>
                </div>
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Customer Code</p>
                  <p className="font-bold text-foreground font-mono text-sm">{viewingCustomer.customer_code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Username</p>
                  <p className="font-bold text-foreground font-mono text-sm">{viewingCustomer.username}</p>
                </div>
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-medium">Temporary Password (Initial)</p>
                    <button
                      type="button"
                      onClick={() => openResetPassword(viewingCustomer)}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors border border-amber-200"
                    >
                      Reset
                    </button>
                  </div>
                  {(viewingCustomer.temp_password || custCredsMap[viewingCustomer.username]) ? (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground font-mono flex-1 text-sm">
                        {showViewCustPw ? (viewingCustomer.temp_password || custCredsMap[viewingCustomer.username]) : "••••••••"}
                      </p>
                      <button type="button" onClick={() => setShowViewCustPw(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        {showViewCustPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No temporary password recorded</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Phone</p>
                  <p className="font-semibold text-foreground text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>{viewingCustomer.phone || "—"}</p>
                </div>
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Member Since</p>
                  <p className="font-semibold text-foreground text-sm">{viewingCustomer.joined || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Gender</p>
                  <p className="font-semibold text-foreground text-sm">{viewingCustomer.gender || "—"}</p>
                </div>
                <div className="p-3.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Civil Status</p>
                  <p className="font-semibold text-foreground text-sm">{viewingCustomer.civil_status || "—"}</p>
                </div>
              </div>

              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Address</p>
                <p className="font-semibold text-foreground text-sm">{viewingCustomer.address || "—"}</p>
              </div>

              {/* Discount Category & Verification */}
              <div className="p-4 bg-background rounded-xl border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Discount Category (Senior Citizen / PWD)</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">
                      {viewingCustomer.discount_type && viewingCustomer.discount_type !== "None"
                        ? `${viewingCustomer.discount_type} (5% Discount)`
                        : "Regular Customer (None)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustDiscount(v => !v);
                      setCustDiscountType((viewingCustomer.discount_type as any) || "None");
                      setCustDiscountId(viewingCustomer.discount_id_no || "");
                    }}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors border border-purple-200"
                  >
                    {editingCustDiscount ? "Cancel" : "Edit Discount"}
                  </button>
                </div>

                {!editingCustDiscount ? (
                  viewingCustomer.discount_id_no ? (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        Verified ID: {viewingCustomer.discount_id_no}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={12} className="stroke-[3]" /> Auto-discount active at POS
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pt-0.5">
                      No Senior or PWD ID on file. You can register their ID here to enable auto-discounts.
                    </p>
                  )
                ) : (
                  <div className="pt-2 border-t border-border space-y-2.5">
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl">
                      {(["None", "Senior Citizen", "PWD"] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setCustDiscountType(type);
                            if (type === "None") setCustDiscountId("");
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                            custDiscountType === type
                              ? "bg-white text-emerald-700 shadow-sm border border-emerald-200"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {type === "Senior Citizen" ? "Senior" : type}
                        </button>
                      ))}
                    </div>

                    {custDiscountType !== "None" && (
                      <div>
                        <label className="block text-[11px] font-bold text-foreground mb-1">
                          {custDiscountType === "Senior Citizen" ? "Senior Citizen ID No." : "PWD ID No."}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={custDiscountId}
                          onChange={e => setCustDiscountId(e.target.value)}
                          placeholder="Enter verified ID number"
                          className="w-full px-3 py-1.5 rounded-xl border border-border bg-card font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={savingCustDiscount}
                      onClick={handleSaveCustomerDiscount}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {savingCustDiscount ? "Saving..." : "Save Discount Status"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border shrink-0">
              <button onClick={() => setViewingCustomer(null)} className="w-full py-2.5 rounded-xl bg-[#1f2937] text-white text-sm font-bold hover:bg-[#374151] transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Customer Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Reset Password</h3>
                  <p className="text-xs text-muted-foreground">{resetTarget.full_name} (@{resetTarget.username})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {resetSuccessData ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Check size={22} className="stroke-[3]" />
                  </div>
                  <h4 className="font-extrabold text-foreground text-sm">Password Reset Successful!</h4>
                  <p className="text-xs text-muted-foreground">
                    The account password for <span className="font-bold text-foreground">@{resetSuccessData.username}</span> has been updated. Please share the new credentials with the customer:
                  </p>
                </div>

                <div className="p-3.5 bg-background rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Temporary Password</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetSuccessData.temp_password)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {copiedPw ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedPw ? "Copied!" : "Copy Password"}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-muted/60 rounded-lg font-mono text-center font-bold text-base text-foreground tracking-wider select-all border border-border">
                    {resetSuccessData.temp_password}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground italic text-center">
                  The customer can immediately log into their account using their username and this new password.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-purple-700 font-bold text-sm">{resetTarget.full_name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium">Customer Account</p>
                    <p className="text-sm font-bold text-foreground truncate">{resetTarget.full_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">@{resetTarget.username} · {resetTarget.customer_code}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground">
                      New Temporary Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetPw(generateRandomPassword())}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Generate New
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showResetPw ? "text" : "password"}
                      value={resetPw}
                      onChange={e => setResetPw(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background font-mono text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showResetPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Enter or generate a new password (min. 6 characters). This will update their login credentials and the temporary password on file.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-bold text-xs hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isResetting || !resetPw.trim() || resetPw.trim().length < 6}
                    onClick={handleResetPassword}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      "Confirm Reset"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



// ─── POS ──────────────────────────────────────────────────────────────────────

function POSPage({ products, categories = CATEGORIES }: { products: Product[]; categories?: string[] }) {
  const { registeredCustomers, refreshData } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [custSearch, setCustSearch] = useState("");
  const [linkedCustomer, setLinkedCustomer] = useState<RegisteredCustomer | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedTrx, setCompletedTrx] = useState<Transaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Discount states (Senior Citizen / PWD)
  const [discountType, setDiscountType] = useState<"None" | "Senior Citizen" | "PWD">("None");
  const [discountIdNo, setDiscountIdNo] = useState("");
  const [saveDiscountToProfile, setSaveDiscountToProfile] = useState(true);

  // Automatically apply discount if linked customer is already registered as Senior Citizen or PWD
  useEffect(() => {
    if (linkedCustomer) {
      if (
        (linkedCustomer.discount_type === "Senior Citizen" || linkedCustomer.discount_type === "PWD") &&
        linkedCustomer.discount_id_no
      ) {
        setDiscountType(linkedCustomer.discount_type);
        setDiscountIdNo(linkedCustomer.discount_id_no);
      } else {
        setDiscountType("None");
        setDiscountIdNo("");
      }
    } else {
      setDiscountType("None");
      setDiscountIdNo("");
    }
  }, [linkedCustomer]);

  const isCustomerRegisteredDiscounted = Boolean(
    linkedCustomer &&
    (linkedCustomer.discount_type === "Senior Citizen" || linkedCustomer.discount_type === "PWD") &&
    linkedCustomer.discount_id_no
  );

  const filtered = useMemo(() =>
    products.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase());
      const mc = category === "All" || p.category === category;
      return ms && mc && p.stock > 0;
    }), [products, search, category]);

  // Calculations: Subtotal, 5% Senior/PWD discount, and net total
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const isDiscountActive =
    (discountType === "Senior Citizen" || discountType === "PWD") &&
    discountIdNo.trim().length > 0;
  const discountRate = isDiscountActive ? 0.05 : 0;
  const discountAmount = isDiscountActive ? Math.round(subtotal * discountRate * 100) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const cash = parseFloat(cashAmount) || 0;
  const change = Math.max(0, cash - total);

  // Check if any cart item exceeds available stock
  const stockExceededItems = useMemo(() => {
    return cart
      .map(item => {
        const live = products.find(p => p.id === item.product.id) || item.product;
        return {
          ...item,
          availableStock: live.stock,
          exceeds: item.qty > live.stock,
        };
      })
      .filter(i => i.exceeds);
  }, [cart, products]);

  const hasStockExceeded = stockExceededItems.length > 0;
  const canComplete = cart.length > 0 && cash >= total && !isProcessing && !hasStockExceeded;

  const addToCart = (product: Product) => {
    if (isProcessing) return;
    const live = products.find(p => p.id === product.id) || product;
    if (live.stock <= 0) {
      toast.error(`"${product.name}" is out of stock!`);
      return;
    }
    const currentInCart = cart.find(i => i.product.id === product.id)?.qty || 0;
    if (currentInCart + 1 > live.stock) {
      toast.error(`Cannot add more "${product.name}". Only ${live.stock} left in stock!`);
      return;
    }
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, product: live, qty: i.qty + 1 } : i);
      return [...prev, { product: live, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    if (isProcessing) return;
    const item = cart.find(i => i.product.id === id);
    if (!item) return;
    const live = products.find(p => p.id === id) || item.product;

    if (delta > 0 && item.qty + delta > live.stock) {
      toast.error(`Cannot increase "${item.product.name}". Only ${live.stock} left in stock!`);
      return;
    }

    setCart(prev => prev.map(i => i.product.id === id ? { ...i, product: live, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const custResults = custSearch.trim().length > 0
    ? registeredCustomers.filter(c =>
        (c.full_name || "").toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.customer_code || "").toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.username || "").toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.phone || "").toLowerCase().includes(custSearch.toLowerCase())
      )
    : [];

  const completeTransaction = async () => {
    if (isProcessing) return;
    if (hasStockExceeded) {
      const first = stockExceededItems[0];
      toast.error(
        `Cannot complete transaction: "${first.product.name}" exceeds available stock (Only ${first.availableStock} left, but ${first.qty} in order)!`
      );
      return;
    }
    if (!canComplete) {
      if (cash < total) {
        toast.error(`Cash tendered is insufficient. Short by ${peso(total - cash)}.`);
      }
      return;
    }
    setIsProcessing(true);
    try {
      const apiItems = cart.map(i => ({ product_id: i.product.id, quantity: i.qty }));
      const [resTrx]: any = await Promise.all([
        api.transactions.create({
          customer_id: linkedCustomer ? linkedCustomer.id : null,
          cashier_id: getSavedUser()?.id || 1,
          cash_tendered: cash,
          items: apiItems,
          discount_type: isDiscountActive ? discountType : "None",
          discount_id_no: isDiscountActive ? discountIdNo.trim() : null,
          discount_amount: discountAmount,
          save_customer_discount: Boolean(linkedCustomer && saveDiscountToProfile && isDiscountActive),
        }),
        new Promise(resolve => setTimeout(resolve, 600)),
      ]);

      const trx: Transaction = {
        id: resTrx?.receipt_no || `TRX-2026-${Math.floor(Math.random() * 9000) + 1000}`,
        customer: linkedCustomer?.full_name ?? "Walk-in",
        customerId: linkedCustomer?.customer_code,
        items: cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
        subtotal,
        discountType: isDiscountActive ? discountType : "None",
        discountIdNo: isDiscountActive ? discountIdNo.trim() : undefined,
        discountAmount,
        total,
        cash,
        change: resTrx ? Number(resTrx.change_amount) : change,
        date: resTrx?.date || new Date().toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        cashier: resTrx?.cashier || (getSavedUser()?.name || "Cashier"),
      };
      setCompletedTrx(trx);
      setShowReceipt(true);
      toast.success(
        isDiscountActive
          ? `Transaction completed with 5% ${discountType} discount!`
          : linkedCustomer
            ? `Transaction completed for ${linkedCustomer.full_name}!`
            : "Transaction completed!"
      );
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete transaction");
      await refreshData();
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTransaction = () => {
    if (isProcessing) return;
    setCart([]);
    setLinkedCustomer(null);
    setCustSearch("");
    setCashAmount("");
    setDiscountType("None");
    setDiscountIdNo("");
    setShowReceipt(false);
    setCompletedTrx(null);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Product panel */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        <div className="p-4 border-b border-border bg-card space-y-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {["All", ...categories].map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${category === cat ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(product => {
              const inCart = cart.find(i => i.product.id === product.id);
              const isOverStock = inCart && inCart.qty > product.stock;
              return (
                <button key={product.id} onClick={() => addToCart(product)} disabled={isProcessing} className={`relative p-3.5 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95 disabled:opacity-75 disabled:pointer-events-none ${isOverStock ? "border-red-400 bg-red-50/50" : inCart ? "border-emerald-500 bg-emerald-50" : "border-border bg-card hover:border-emerald-300"}`}>
                  {inCart && (
                    <span className={`absolute top-2 right-2 px-1.5 min-w-[20px] h-5 ${isOverStock ? "bg-red-500" : "bg-emerald-500"} text-white text-xs font-extrabold rounded-full flex items-center justify-center`}>{inCart.qty}</span>
                  )}
                  <div className={`w-full aspect-square rounded-xl mb-2.5 overflow-hidden flex items-center justify-center ${CAT_BG[product.category] ?? "bg-gray-50"}`}>
                    {product.image_url ? (
                      <img src={getProductImageUrl(product.image_url) || ""} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={22} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-sm font-extrabold text-emerald-600 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(product.price)}</p>
                  <p className={`text-xs mt-0.5 ${product.stock <= 2 ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{product.stock} left</p>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Package size={32} className="opacity-20 mb-2" />
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 xl:w-96 flex flex-col bg-card shrink-0">
        <div className="px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-foreground">Current Order</h3>
              <p className="text-xs text-muted-foreground">{cart.reduce((s, i) => s + i.qty, 0)} item(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setShowReturnModal(true)}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Process product return & choose replacement item from store inventory"
            >
              <RotateCcw size={13} />
              <span>Replace Item</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
              <ShoppingCart size={28} className="opacity-20 mb-2" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs">Tap products to add them</p>
            </div>
          ) : (
            cart.map(item => {
              const liveStock = products.find(p => p.id === item.product.id)?.stock ?? item.product.stock;
              const isOverStock = item.qty > liveStock;
              return (
                <div key={item.product.id} className={`p-2.5 rounded-xl transition-all ${isOverStock ? "bg-red-50/90 border border-red-300" : "bg-background"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-border/40 ${CAT_BG[item.product.category] ?? "bg-gray-100"}`}>
                      {item.product.image_url ? (
                        <img src={getProductImageUrl(item.product.image_url) || ""} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={15} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(item.product.price)} each</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.product.id, -1)} disabled={isProcessing} className="w-6 h-6 rounded-full bg-muted hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50"><Minus size={10} /></button>
                      <span className={`w-6 text-center text-sm font-extrabold ${isOverStock ? "text-red-600 font-bold" : ""}`} style={{ fontFamily: "'DM Mono', monospace" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} disabled={isProcessing || item.qty >= liveStock} className={`w-6 h-6 rounded-full bg-muted flex items-center justify-center transition-colors ${item.qty >= liveStock ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-200"}`}><Plus size={10} /></button>
                    </div>
                    <span className="text-sm font-bold w-14 text-right shrink-0 text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(item.product.price * item.qty)}</span>
                    <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} disabled={isProcessing} className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"><Trash2 size={12} /></button>
                  </div>

                  {isOverStock && (
                    <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-red-700 bg-red-100/90 px-2 py-1 rounded-md">
                      <span className="flex items-center gap-1">
                        <AlertCircle size={13} className="shrink-0 text-red-600" />
                        Exceeds stock ({liveStock} left, {item.qty} in order)
                      </span>
                      <button
                        type="button"
                        onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, qty: liveStock } : i))}
                        className="text-[10px] underline font-extrabold hover:text-red-900 ml-1.5 shrink-0"
                      >
                        Adjust to {liveStock}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Customer lookup */}
        <div className="px-3.5 py-2 border-t border-border shrink-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Customer (Optional)</p>
          {linkedCustomer ? (
            <div className="flex items-center gap-2 p-1.5 px-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{(linkedCustomer.full_name || "C").charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate leading-tight">{linkedCustomer.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {linkedCustomer.customer_code} • @{linkedCustomer.username}
                </p>
              </div>
              <button onClick={() => { setLinkedCustomer(null); setCustSearch(""); }} disabled={isProcessing} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-0.5 disabled:opacity-50"><X size={13} /></button>
            </div>
          ) : (
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={custSearch} onChange={e => setCustSearch(e.target.value)} disabled={isProcessing} placeholder="Search customer name or ID..." className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50" />
              {custResults.length > 0 && !isProcessing && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {custResults.map(c => {
                    const hasDiscount = (c.discount_type === "Senior Citizen" || c.discount_type === "PWD") && c.discount_id_no;
                    return (
                      <button key={c.id} onClick={() => { setLinkedCustomer(c); setCustSearch(""); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">{(c.full_name || "C").charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-foreground truncate">{c.full_name}</p>
                            {hasDiscount && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded">
                                {c.discount_type === "Senior Citizen" ? "Senior" : "PWD"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: "'DM Mono', monospace" }}>{c.customer_code} • @{c.username}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Discount (Senior Citizen / PWD) */}
        <div className="px-3.5 py-2 border-t border-border shrink-0 bg-slate-50/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Percent size={11} className="text-emerald-600" />
              Discount (Senior / PWD)
            </span>
            {isDiscountActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                <Check size={10} className="stroke-[3]" />
                5% Applied
              </span>
            )}
          </div>

          {/* Discount type toggle buttons */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/60 rounded-lg">
            {(["None", "Senior Citizen", "PWD"] as const).map(type => {
              const active = discountType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setDiscountType(type);
                    if (type === "None") setDiscountIdNo("");
                    else if (
                      linkedCustomer &&
                      linkedCustomer.discount_type === type &&
                      linkedCustomer.discount_id_no
                    ) {
                      setDiscountIdNo(linkedCustomer.discount_id_no);
                    }
                  }}
                  className={`py-1 px-1.5 rounded-md text-[11px] font-bold transition-all text-center disabled:opacity-50 ${
                    active
                      ? "bg-white text-emerald-700 shadow-sm border border-emerald-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "Senior Citizen" ? "Senior (5%)" : type === "PWD" ? "PWD (5%)" : "None"}
                </button>
              );
            })}
          </div>

          {/* ID verification input when Senior Citizen or PWD is selected */}
          {discountType !== "None" && (
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-foreground">
                  {discountType === "Senior Citizen" ? "Senior Citizen ID No." : "PWD ID No."}{" "}
                  <span className="text-red-500">*</span>
                </label>
                {isCustomerRegisteredDiscounted &&
                  linkedCustomer?.discount_type === discountType && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                      <Check size={9} className="stroke-[3]" /> Registered ID
                    </span>
                  )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={discountIdNo}
                  disabled={isProcessing}
                  onChange={e => setDiscountIdNo(e.target.value)}
                  placeholder={
                    discountType === "Senior Citizen"
                      ? "Enter OSCA / Senior ID No."
                      : "Enter PWD ID No."
                  }
                  className={`w-full px-2.5 py-1 pr-7 text-xs rounded-lg border bg-background font-mono font-medium focus:outline-none focus:ring-1 disabled:opacity-50 ${
                    isDiscountActive
                      ? "border-emerald-400 focus:ring-emerald-400/30 text-emerald-800"
                      : "border-amber-400 focus:ring-amber-400/30"
                  }`}
                />
                {discountIdNo.trim() ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600">
                    <CheckCircle size={13} />
                  </div>
                ) : (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500">
                    <AlertCircle size={13} />
                  </div>
                )}
              </div>

              {!isDiscountActive && (
                <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  Enter ID number to apply 5% discount.
                </p>
              )}

              {/* Option: save ID to customer profile if linked customer doesn't have it saved yet */}
              {linkedCustomer && !isCustomerRegisteredDiscounted && (
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={saveDiscountToProfile}
                    disabled={isProcessing}
                    onChange={e => setSaveDiscountToProfile(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 disabled:opacity-50"
                  />
                  <span>Save ID to customer profile</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="p-3 border-t border-border space-y-2 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(subtotal)}</span>
            </div>
            {isDiscountActive && (
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span>Discount (5% {discountType === "Senior Citizen" ? "Senior" : "PWD"})</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>-{peso(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <span className="text-sm font-extrabold text-foreground">TOTAL TO PAY</span>
              <span className="text-lg font-extrabold text-emerald-600" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(total)}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cash Tendered</label>
            <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} disabled={isProcessing} placeholder="0.00" className="mt-1 w-full px-3 py-1.5 rounded-lg border border-border bg-background text-base font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50" style={{ fontFamily: "'DM Mono', monospace" }} />
            <div className="flex gap-1.5 mt-1.5">
              {[50, 100, 500, 1000].map(amt => (
                <button key={amt} onClick={() => setCashAmount(String(amt))} disabled={isProcessing} className="flex-1 py-1 text-xs font-bold rounded-lg bg-muted hover:bg-slate-200 transition-colors disabled:opacity-50">₱{amt}</button>
              ))}
            </div>
          </div>

          {cash >= total && cash > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs font-bold text-emerald-700">Change</span>
              <span className="text-base font-extrabold text-emerald-700" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(change)}</span>
            </div>
          )}
          {cash > 0 && cash < total && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
              <span className="text-xs font-bold text-red-600">Short by</span>
              <span className="text-xs font-extrabold text-red-600" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(total - cash)}</span>
            </div>
          )}

          {/* Stock Exceeded Alert Banner */}
          {hasStockExceeded && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-red-800">Cannot Complete Transaction</p>
                <p className="text-[11px] text-red-600 mt-0.5 leading-snug">
                  {stockExceededItems.map(i => `"${i.product.name}" (${i.qty} in order, only ${i.availableStock} left in stock)`).join(" • ")}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={completeTransaction}
            disabled={isProcessing || (!canComplete && !hasStockExceeded && (cart.length === 0 || cash < total))}
            className={`w-full py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              isProcessing
                ? "bg-emerald-700 text-white cursor-wait opacity-90 shadow-sm"
                : hasStockExceeded
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20 active:scale-[0.99] cursor-pointer"
                  : canComplete
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.99]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : hasStockExceeded ? (
              <>
                <AlertCircle size={15} />
                <span>Cannot Complete (Stock Exceeded)</span>
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                <span>Complete Transaction</span>
              </>
            )}
          </button>
          {cart.length > 0 && (
            <button
              onClick={clearTransaction}
              disabled={isProcessing}
              className="w-full py-1 text-[11px] font-semibold text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear Order
            </button>
          )}
        </div>
      </div>

      {/* Transaction processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs w-full">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Loader2 size={30} className="animate-spin" />
            </div>
            <div>
              <h3 className="font-extrabold text-foreground text-base">Processing Transaction</h3>
              <p className="text-xs text-muted-foreground mt-1">Recording payment and updating inventory...</p>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full animate-pulse w-3/4"></div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <Clock size={12} className="text-emerald-500 animate-spin" />
              <span>Please do not close or navigate away</span>
            </div>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {showReceipt && completedTrx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-6 text-center text-white">
              <CheckCircle size={44} className="mx-auto mb-2" />
              <h3 className="font-extrabold text-lg">Transaction Complete!</h3>
              <p className="text-emerald-200 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>{completedTrx.id}</p>
            </div>

            <div className="p-5 space-y-4" style={{ fontFamily: "'DM Mono', monospace" }}>
              <div className="text-center border-b border-dashed border-slate-200 pb-4">
                <p className="font-extrabold text-xl text-foreground">SmartMart</p>
                <p className="text-muted-foreground text-xs">Convenience Store</p>
                <p className="text-xs text-muted-foreground mt-1">{completedTrx.date}</p>
              </div>

              <div className="text-xs space-y-0.5 text-muted-foreground">
                <p>Cashier: {completedTrx.cashier}</p>
                <p>Customer: {completedTrx.customer}</p>
                {completedTrx.discountType && completedTrx.discountType !== "None" && (
                  <p className="text-emerald-700 font-semibold">
                    Discount: {completedTrx.discountType} (5%)
                  </p>
                )}
                {completedTrx.discountIdNo && (
                  <p className="text-emerald-700 font-semibold">
                    ID No: {completedTrx.discountIdNo}
                  </p>
                )}
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
                {completedTrx.items.map(item => (
                  <div key={item.name} className="flex justify-between text-xs">
                    <span className="text-foreground">{item.name} ×{item.qty}</span>
                    <span className="text-foreground">{peso(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{peso(completedTrx.subtotal ?? completedTrx.total)}</span>
                </div>
                {completedTrx.discountType && completedTrx.discountType !== "None" && (completedTrx.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                    <span>Discount (5% {completedTrx.discountType === "Senior Citizen" ? "Senior" : "PWD"})</span>
                    <span>-{peso(completedTrx.discountAmount!)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-foreground pt-1 border-t border-dashed border-slate-200">
                  <span>TOTAL</span>
                  <span>{peso(completedTrx.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Cash</span>
                  <span>{peso(completedTrx.cash)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-emerald-600">
                  <span>Change</span>
                  <span>{peso(completedTrx.change)}</span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground border-t border-dashed border-slate-200 pt-3">Thank you for shopping at SmartMart!</p>
            </div>

            <div className="p-4 flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
                <Printer size={14} /> Print
              </button>
              <button onClick={clearTransaction} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && (
        <RequestReturnModal
          availableProducts={products as any}
          onClose={() => setShowReturnModal(false)}
          onSuccess={async () => {
            setShowReturnModal(false);
            await refreshData();
          }}
        />
      )}
    </div>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────────

function StaffDashboard({ onNavigate, products = [] }: { onNavigate: (p: StaffPage) => void; products?: Product[] }) {
  const { transactions, refreshData } = useStore();
  const user = getSavedUser();
  const staffName = user?.name || "Cashier";

  const [selectedReceipt, setSelectedReceipt] = useState<TransactionItem | null>(null);
  const [receiptItems, setReceiptItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [lowStockSearch, setLowStockSearch] = useState("");

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Customer total spent map across all transactions
  const customerSpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      const cust = (t.customer || (t as any).customer_name || "").trim();
      if (cust && cust.toLowerCase() !== "walk-in" && cust.toLowerCase() !== "walk-in customer") {
        const key = cust.toLowerCase();
        map[key] = (map[key] || 0) + Number(t.total_amount || 0);
      }
    });
    return map;
  }, [transactions]);

  // Determine dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Filter today's transactions
  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const todayTransactions = useMemo(() => {
    return transactions.filter(t => isToday(t.date));
  }, [transactions]);

  const todaySales = useMemo(() => {
    return todayTransactions.reduce((s, t) => s + Number(t.total_amount || 0), 0);
  }, [todayTransactions]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock !== undefined && p.stock <= 10);
  }, [products]);

  const avgTicket = useMemo(() => {
    return todayTransactions.length > 0 ? todaySales / todayTransactions.length : 0;
  }, [todayTransactions, todaySales]);

  // Recent transactions to show (prefer today's, limited to 5)
  const displayTransactions = useMemo(() => {
    const list = todayTransactions.length > 0 ? todayTransactions : transactions;
    return list.slice(0, 5);
  }, [todayTransactions, transactions]);

  const handleOpenReceipt = async (t: TransactionItem) => {
    setSelectedReceipt(t);
    setLoadingItems(true);
    try {
      const items: any = await api.transactions.getItems(t.id);
      setReceiptItems(items.map((i: any) => ({
        name: i.product_name || i.name,
        qty: Number(i.quantity || 1),
        price: Number(i.unit_price || i.price || 0)
      })));
    } catch {
      setReceiptItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-foreground">
              {greeting}, {staffName}!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Register
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Receipt size={22} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Transactions</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
              {todayTransactions.length}
            </p>
            <p className="text-xs text-emerald-500 font-semibold mt-0.5">All Completed</p>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
            <TrendingUp size={22} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Sales</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
              {peso(todaySales)}
            </p>
            <p className="text-xs text-blue-500 font-semibold mt-0.5">Live Shift Revenue</p>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Package size={22} className="text-purple-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Products</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
              {products.length}
            </p>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ClipboardList size={22} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Sale</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
              {peso(avgTicket)}
            </p>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">Per receipt</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Transactions Table + Quick Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Transactions */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-emerald-500" />
              <h3 className="font-extrabold text-foreground text-lg">
                {todayTransactions.length > 0 ? "Today's Transactions" : "Recent Transactions"}
              </h3>
              <span className="px-2 py-0.5 text-xs font-bold bg-muted text-muted-foreground rounded-md border border-border">
                {displayTransactions.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate("transactions")}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All History <ChevronRight size={14} />
            </button>
          </div>

          {displayTransactions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Receipt size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">No transactions recorded yet today</p>
                <p className="text-xs text-muted-foreground mt-0.5">Process customer checkout through Point of Sale</p>
              </div>
              <button
                onClick={() => onNavigate("pos")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
              >
                <ShoppingCart size={14} /> Launch POS
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {displayTransactions.map((t, idx) => {
                const rawCustomer = t.customer || (t as any).customer_name;
                const isRegistered = Boolean(
                  rawCustomer &&
                  rawCustomer.trim() !== "" &&
                  rawCustomer.toLowerCase() !== "walk-in" &&
                  rawCustomer.toLowerCase() !== "walk-in customer"
                );
                const displayCustName = isRegistered ? rawCustomer : "Walk-in Customer";
                const receiptNumber = t.receipt_no || (t as any).receipt_number || `REC-${t.id}`;

                return (
                  <div
                    key={t.id || idx}
                    onClick={() => handleOpenReceipt(t)}
                    className="flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                        isRegistered
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}>
                        {isRegistered ? (
                          <span className="font-extrabold text-sm">{displayCustName.charAt(0)}</span>
                        ) : (
                          <CheckCircle size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-extrabold text-foreground truncate">
                            {displayCustName}
                          </p>
                          {isRegistered && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Member Account
                            </span>
                          )}
                          {isRegistered && (
                            <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5">
                              Total Spent: <strong className="ml-1 font-mono font-bold text-emerald-400">{peso(customerSpentMap[rawCustomer.toLowerCase().trim()] || Number(t.total_amount || 0))}</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span style={{ fontFamily: "'DM Mono', monospace" }}>{receiptNumber}</span>
                          <span>•</span>
                          <span>{t.date ? new Date(t.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "Just now"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {peso(Number(t.total_amount || 0))}
                        </p>
                        <span className="inline-block text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          Completed
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Low Stock Warning */}
        <div className="space-y-6">
          {/* Low Stock Watchlist */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h4 className="text-sm font-extrabold text-foreground">Low Stock Alert</h4>
              </div>
              <button
                onClick={() => setShowLowStockModal(true)}
                className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                {lowStockProducts.length} items <ChevronRight size={12} />
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">All inventory levels are healthy.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {lowStockProducts.slice(0, 6).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl text-xs hover:bg-muted/70 transition-colors">
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{p.name}</span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-xs font-extrabold bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}

            {lowStockProducts.length > 0 && (
              <button
                onClick={() => setShowLowStockModal(true)}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.99] text-amber-500 font-extrabold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2 cursor-pointer"
              >
                <Eye size={14} /> Show All Low Stock ({lowStockProducts.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="font-extrabold text-foreground text-sm">Receipt Preview</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-4 font-mono text-xs">
              <div className="text-center space-y-1">
                <p className="font-bold text-base text-foreground font-sans">SmartMart Supermarket</p>
                <p className="text-muted-foreground text-[11px]">Official Sales Receipt</p>
                <p className="text-muted-foreground text-[11px]">Receipt #{selectedReceipt.receipt_no || (selectedReceipt as any).receipt_number || selectedReceipt.id}</p>
              </div>

              <div className="border-t border-b border-dashed border-border py-2 space-y-1 text-muted-foreground text-[11px]">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold text-foreground">
                    {(() => {
                      const cName = selectedReceipt.customer || (selectedReceipt as any).customer_name;
                      const isReg = Boolean(cName && cName.toLowerCase() !== "walk-in" && cName.toLowerCase() !== "walk-in customer");
                      return isReg ? `${cName} (Member)` : "Walk-in Customer";
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{selectedReceipt.cashier || (selectedReceipt as any).cashier_name || staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{selectedReceipt.date || "Today"}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-foreground border-b border-border pb-1">
                  <span>Item</span>
                  <span>Amount</span>
                </div>

                {loadingItems ? (
                  <p className="text-center text-muted-foreground py-4">Loading receipt items...</p>
                ) : receiptItems.length === 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Standard Purchase</span>
                    <span>{peso(Number(selectedReceipt.total_amount || 0))}</span>
                  </div>
                ) : (
                  receiptItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-foreground">
                      <span className="truncate max-w-[200px]">
                        {item.name} <span className="text-muted-foreground">×{item.qty}</span>
                      </span>
                      <span>{peso(item.price * item.qty)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between font-extrabold text-sm text-foreground">
                  <span>Total Amount</span>
                  <span className="text-emerald-600">{peso(Number(selectedReceipt.total_amount || 0))}</span>
                </div>
                {selectedReceipt.cash_tendered !== undefined && Number(selectedReceipt.cash_tendered) > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Cash Tendered:</span>
                      <span>{peso(Number(selectedReceipt.cash_tendered))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Change:</span>
                      <span>{peso(Number(selectedReceipt.change_amount || 0))}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-center text-[11px] text-muted-foreground border-t border-dashed border-border pt-3">
                Thank you for shopping at SmartMart!
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border bg-muted/20 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Low Stock Products Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/40 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-base">Low Stock Inventory Watchlist</h3>
                    <p className="text-muted-foreground text-xs">
                      {lowStockProducts.length} product{lowStockProducts.length !== 1 ? "s" : ""} require attention (≤10 in stock)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowLowStockModal(false); setLowStockSearch(""); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search in modal */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={lowStockSearch}
                  onChange={e => setLowStockSearch(e.target.value)}
                  placeholder="Filter low stock items by name or category..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Modal Table / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(() => {
                const filtered = lowStockProducts.filter(p =>
                  (p.name || "").toLowerCase().includes(lowStockSearch.toLowerCase()) ||
                  (p.category || "").toLowerCase().includes(lowStockSearch.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      No low stock products match "{lowStockSearch}".
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-border">
                    {filtered.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/40 rounded-xl transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                            {p.image_url ? (
                              <img src={getProductImageUrl(p.image_url) || ""} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={16} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">{p.category} • <span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(p.price)}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold font-mono ${
                            (p.stock ?? 0) <= 3
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}>
                            {p.stock} units left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground">
                Showing {lowStockProducts.filter(p =>
                  (p.name || "").toLowerCase().includes(lowStockSearch.toLowerCase()) ||
                  (p.category || "").toLowerCase().includes(lowStockSearch.toLowerCase())
                ).length} of {lowStockProducts.length} items
              </span>
              <button
                onClick={() => { setShowLowStockModal(false); setLowStockSearch(""); }}
                className="px-5 py-2 bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold rounded-xl transition-colors"
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

// ─── Transactions Page ────────────────────────────────────────────────────────

function TransactionsPage() {
  const { transactions, refreshData } = useStore();
  const [selected, setSelected] = useState<TransactionItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [allSearch, setAllSearch] = useState("");

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const DISPLAY_LIMIT = 10;

  // Precompute customer total spent map across all recorded transactions
  const customerSpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      const cust = (t.customer || "").trim();
      if (cust && cust.toLowerCase() !== "walk-in" && cust.toLowerCase() !== "walk-in customer") {
        const key = cust.toLowerCase();
        map[key] = (map[key] || 0) + Number(t.total_amount || 0);
      }
    });
    return map;
  }, [transactions]);

  // Check if current search query matches any registered customer name
  const matchedCustomerNames = useMemo(() => {
    const q = allSearch.trim().toLowerCase();
    if (!q) return [];
    const qTokens = q.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    const names = new Set<string>();
    transactions.forEach(t => {
      const cust = (t.customer || "").trim();
      if (cust && cust.toLowerCase() !== "walk-in" && cust.toLowerCase() !== "walk-in customer") {
        const lowerCust = cust.toLowerCase();
        const matches = lowerCust.includes(q) || (qTokens.length > 0 && qTokens.every(tok => lowerCust.includes(tok)));
        if (matches) {
          names.add(cust);
        }
      }
    });
    return Array.from(names);
  }, [allSearch, transactions]);

  // It is a customer search if the cashier query matches customer(s)
  const isCustomerSearch = Boolean(allSearch.trim() && matchedCustomerNames.length > 0);

  // Overall total revenue
  const totalRevenue = useMemo(() => {
    return transactions.reduce((s, t) => s + Number(t.total_amount || 0), 0);
  }, [transactions]);

  // When a customer is searched, compute total spent for that customer (or matching customers)
  const customerTotalSpent = useMemo(() => {
    if (!isCustomerSearch) return 0;
    if (matchedCustomerNames.length === 1) {
      return customerSpentMap[matchedCustomerNames[0].toLowerCase()] || 0;
    }
    const targetSet = new Set(matchedCustomerNames.map(n => n.toLowerCase()));
    return transactions
      .filter(t => t.customer && targetSet.has(t.customer.toLowerCase().trim()))
      .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  }, [isCustomerSearch, matchedCustomerNames, customerSpentMap, transactions]);

  // Filtered transactions for search
  const filteredAll = useMemo(() => {
    if (!allSearch.trim()) return transactions;
    const q = allSearch.toLowerCase();
    const qTokens = q.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    return transactions.filter(t => {
      const cust = (t.customer || "").toLowerCase();
      const matchCust = cust.includes(q) || (qTokens.length > 0 && qTokens.every(tok => cust.includes(tok)));
      return (
        matchCust ||
        t.receipt_no.toLowerCase().includes(q) ||
        t.cashier.toLowerCase().includes(q) ||
        t.date.toLowerCase().includes(q) ||
        String(t.total_amount).includes(q)
      );
    });
  }, [transactions, allSearch]);

  const recentTransactions = transactions.slice(0, DISPLAY_LIMIT);
  const hasMore = transactions.length > DISPLAY_LIMIT;

  const handleSelectTransaction = async (t: TransactionItem) => {
    setSelected(t);
    setLoadingItems(true);
    try {
      const items: any = await api.transactions.getItems(t.id);
      setSelectedItems(items.map((i: any) => ({
        name: i.product_name || i.name,
        qty: Number(i.quantity || 1),
        price: Number(i.unit_price || i.price || 0)
      })));
    } catch {
      setSelectedItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const renderRow = (t: TransactionItem) => {
    return (
      <tr key={t.id} className="hover:bg-muted/20 transition-colors">
        <td className="px-4 py-3 text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{t.receipt_no}</td>
        <td className="px-4 py-3 text-sm font-medium text-foreground">{t.customer}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{t.cashier}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{t.date}</td>
        <td className="px-4 py-3 text-right text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</td>
        <td className="px-4 py-3 text-center"><Badge variant="success">Completed</Badge></td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => handleSelectTransaction(t)} className="px-3 py-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors">View Receipt</button>
        </td>
      </tr>
    );
  };

  const tableHead = (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receipt No</th>
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cashier</th>
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date / Time</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
      </tr>
    </thead>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm">
            Showing recent {recentTransactions.length} of {transactions.length} total records
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasMore && (
            <button
              onClick={() => {
                setAllSearch("");
                setShowAllModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm shrink-0"
            >
              <ClipboardList size={15} /> View All Transactions ({transactions.length})
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics Bar on Main Page */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Count</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{transactions.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
            <ClipboardList size={18} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Sales
            </p>
            <p className="text-xl font-extrabold text-emerald-500 mt-0.5 truncate" style={{ fontFamily: "'DM Mono', monospace" }}>
              {peso(totalRevenue)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Receipt size={18} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Showing</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
              {recentTransactions.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
            <Search size={18} />
          </div>
        </div>
      </div>

      {/* Main table — recent records */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full">
          {tableHead}
          <tbody className="divide-y divide-border">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                  No transactions found
                </td>
              </tr>
            ) : (
              recentTransactions.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Professional Centered "All Transactions" Modal ─── */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ animation: "txFadeIn .2s ease" }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllModal(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden" style={{ animation: "txSlideUp .2s ease" }}>
            
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground leading-tight">All Transactions</h2>
                  <p className="text-xs text-muted-foreground">{transactions.length} total transactions recorded</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Compact Search */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={allSearch}
                    onChange={e => setAllSearch(e.target.value)}
                    placeholder="Search receipt, customer..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-muted/40 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                  {allSearch && (
                    <button onClick={() => setAllSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAllModal(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="shrink-0 px-6 py-3 bg-muted/20 border-b border-border grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl border border-border px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total Count</span>
                <span className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{transactions.length}</span>
              </div>
              <div className={`rounded-xl border px-4 py-2 flex items-center justify-between transition-all ${isCustomerSearch ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-card border-border"}`}>
                <div className="flex flex-col min-w-0 pr-1">
                  <span className={`text-xs font-semibold ${isCustomerSearch ? "text-emerald-500 font-bold" : "text-muted-foreground"}`}>
                    {isCustomerSearch ? "Total Spent" : "Total Sales"}
                  </span>
                  {isCustomerSearch && matchedCustomerNames.length === 1 && (
                    <span className="text-[10px] text-emerald-500 font-medium truncate max-w-[120px]" title={matchedCustomerNames[0]}>
                      {matchedCustomerNames[0]}
                    </span>
                  )}
                </div>
                <span className="text-sm font-extrabold text-emerald-500 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {peso(isCustomerSearch ? customerTotalSpent : totalRevenue)}
                </span>
              </div>
              <div className="bg-card rounded-xl border border-border px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Filtered</span>
                <span className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{filteredAll.length}</span>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Receipt No</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Cashier</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Date / Time</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAll.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        <Search size={28} className="mx-auto mb-2 opacity-30" />
                        No transactions match "{allSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredAll.map(renderRow)
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 border-t border-border px-6 py-3 bg-card flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredAll.length}</span> of {transactions.length} transactions
              </p>
              <button
                onClick={() => setShowAllModal(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Detail Modal ─── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{selected.receipt_no}</h3>
                <p className="text-sm text-muted-foreground">{selected.date}</p>
              </div>
              <button onClick={() => { setSelected(null); setSelectedItems([]); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selected.customer}</p>
                  {selected.customer && selected.customer.toLowerCase() !== "walk-in" && selected.customer.toLowerCase() !== "walk-in customer" && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="text-muted-foreground font-normal text-[11px]">Total Spent:</span>
                      <span className="font-bold font-mono">
                        {peso(customerSpentMap[selected.customer.toLowerCase().trim()] || Number(selected.total_amount || 0))}
                      </span>
                    </p>
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Cashier</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selected.cashier}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
                {loadingItems ? (
                  <p className="text-xs text-muted-foreground">Loading receipt details...</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItems.map(item => (
                      <div key={item.name} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.name} <span className="text-muted-foreground">×{item.qty}</span></span>
                        <span className="font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5">
                <div className="flex justify-between font-extrabold text-foreground"><span>Total</span><span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(selected.total_amount))}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Cash</span><span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(selected.cash_tendered))}</span></div>
                <div className="flex justify-between text-sm font-extrabold text-emerald-600"><span>Change</span><span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(selected.change_amount))}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="success">Completed</Badge>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes txFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes txSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


// ─── Customer Browse ──────────────────────────────────────────────────────────

function CustomerBrowse({ products, categories = CATEGORIES }: { products: Product[]; categories?: string[] }) {
  const user = getSavedUser();
  const customerName = user?.name || "Valued Customer";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() =>
    products.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase());
      const mc = category === "All" || p.category === category;
      return ms && mc;
    }), [products, search, category]);

  return (
    <div className="p-6 space-y-6 bg-background text-foreground min-h-full transition-colors">
      <div className="relative overflow-hidden rounded-3xl p-7 text-white bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-600 shadow-xl border border-emerald-500/30">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-bold mb-3 border border-white/20">
            <Sparkles size={13} className="text-amber-300" />
            <span>Member Exclusive Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome, {customerName}!</h1>
          <p className="text-emerald-100/90 text-sm mt-1.5 max-w-xl">
            Explore live product availability, member pricing, and stock status before visiting our physical checkout counter.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-black/25 backdrop-blur-md rounded-xl px-3.5 py-2 border border-white/10">
            <AlertTriangle size={14} className="text-amber-300 shrink-0" />
            <span className="text-xs text-white/90 font-medium">Walk-in checkout · Pay in-person with Cash, Senior Citizen, or PWD ID</span>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by title or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors shadow-xs"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs cursor-pointer"
        >
          <option>All</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(p => (
          <button key={p.id} onClick={() => setSelected(p)} className="bg-card rounded-2xl border border-border p-4 text-left hover:shadow-lg hover:border-emerald-500/40 transition-all group duration-200">
            <div className={`w-full aspect-square rounded-xl mb-3 overflow-hidden flex items-center justify-center ${CAT_BG[p.category] ?? "bg-muted"}`}>
              {p.image_url ? (
                <img src={getProductImageUrl(p.image_url) || ""} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <Package size={28} className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
              )}
            </div>
            <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{p.name}</p>
            <p className="text-base font-extrabold text-emerald-500 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(p.price)}</p>
            <div className="mt-2 flex flex-col gap-1">
              {p.stock > 10 ? <Badge variant="success">In Stock</Badge> : p.stock > 0 ? <Badge variant="warning">Low Stock</Badge> : <Badge variant="danger">Out of Stock</Badge>}
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{p.stock > 0 ? `${p.stock} units available` : "No stock"}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-foreground text-base truncate pr-2">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className={`w-full h-48 rounded-2xl mb-5 overflow-hidden flex items-center justify-center ${CAT_BG[selected.category] ?? "bg-muted"}`}>
              {selected.image_url ? (
                <img src={getProductImageUrl(selected.image_url) || ""} alt={selected.name} className="w-full h-full object-contain" />
              ) : (
                <Package size={60} className="text-muted-foreground/50" />
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${CAT_COLORS[selected.category] ?? "bg-muted text-foreground"}`}>{selected.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price</span>
                <span className="font-extrabold text-lg text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(selected.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Availability</span>
                {selected.stock > 10 ? <Badge variant="success">In Stock ({selected.stock} units)</Badge> : selected.stock > 0 ? <Badge variant="warning">Low Stock ({selected.stock} left)</Badge> : <Badge variant="danger">Out of Stock</Badge>}
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-500 font-medium leading-relaxed">Visit us in-store to purchase this product. Online purchasing is not available.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customer History ─────────────────────────────────────────────────────────

function CustomerHistory({ onNavigate }: { onNavigate?: (page: CustomerPage) => void }) {
  const [myTrx, setMyTrx] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TransactionItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [showAllModal, setShowAllModal] = useState(false);
  const [allSearch, setAllSearch] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transactions.getMyHistory();
      setMyTrx(res);
    } catch (e) {
      console.warn("Error fetching customer purchase history:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const DISPLAY_LIMIT = 5;
  const recentTrx = myTrx.slice(0, DISPLAY_LIMIT);
  const hasMore = myTrx.length > DISPLAY_LIMIT;

  const totalSpent = myTrx.reduce((sum, t) => sum + Number(t.total_amount), 0);

  const filteredAll = useMemo(() => {
    if (!allSearch.trim()) return myTrx;
    const q = allSearch.toLowerCase();
    return myTrx.filter(t =>
      t.receipt_no.toLowerCase().includes(q) ||
      t.cashier.toLowerCase().includes(q) ||
      t.date.toLowerCase().includes(q) ||
      String(t.total_amount).includes(q)
    );
  }, [myTrx, allSearch]);

  const handleSelectReceipt = async (t: TransactionItem) => {
    setSelected(t);
    try {
      const items: any = await api.transactions.getItems(t.id);
      setSelectedItems(items.map((i: any) => ({
        name: i.product_name,
        qty: i.quantity,
        price: Number(i.unit_price)
      })));
    } catch {
      setSelectedItems([]);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Purchase History</h1>
          <p className="text-muted-foreground text-sm">
            {hasMore ? `Showing recent ${recentTrx.length} of ${myTrx.length} purchases on record` : `${myTrx.length} purchases on record`}
          </p>
        </div>
        {hasMore && (
          <button
            onClick={() => { setShowAllModal(true); setAllSearch(""); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-[#22c55e] text-white hover:bg-[#16a34a] transition-all shadow-sm"
          >
            <ClipboardList size={15} /> View All Purchases
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48 text-muted-foreground">
          <p className="text-sm">Loading purchase history...</p>
        </div>
      ) : myTrx.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 text-muted-foreground">
          <Receipt size={40} className="opacity-20 mb-3" />
          <p className="font-semibold">No purchases yet</p>
          <p className="text-sm">Visit the store to start your purchase history.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTrx.map(t => (
            <div key={t.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:border-emerald-200 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-extrabold text-foreground text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>{t.receipt_no}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.date}</p>
                  <p className="text-xs text-muted-foreground">Cashier: {t.cashier}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</p>
                  <Badge variant="success">Completed</Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                <span style={{ fontFamily: "'DM Mono', monospace" }}>Cash: {peso(Number(t.cash_tendered))} · Change: {peso(Number(t.change_amount))}</span>
                <button onClick={() => handleSelectReceipt(t)} className="text-emerald-600 font-bold hover:underline cursor-pointer">View Receipt</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Professional Centered "All Purchases" Modal ─── */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ animation: "txFadeIn .2s ease" }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllModal(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden" style={{ animation: "txSlideUp .2s ease" }}>
            
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground leading-tight">All Purchase History</h2>
                  <p className="text-xs text-muted-foreground">{myTrx.length} total purchases on record</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Compact Search */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={allSearch}
                    onChange={e => setAllSearch(e.target.value)}
                    placeholder="Search receipt, cashier, date..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                  />
                  {allSearch && (
                    <button onClick={() => setAllSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAllModal(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="shrink-0 px-6 py-3 bg-muted/40 border-b border-border grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl border border-border px-4 py-2 flex items-center justify-between shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground">Total Purchases</span>
                <span className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{myTrx.length}</span>
              </div>
              <div className="bg-card rounded-xl border border-border px-4 py-2 flex items-center justify-between shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground">Total Spent</span>
                <span className="text-sm font-extrabold text-purple-500" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(totalSpent)}</span>
              </div>
              <div className="bg-card rounded-xl border border-border px-4 py-2 flex items-center justify-between shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground">Filtered</span>
                <span className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{filteredAll.length}</span>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card border-b border-border z-10 shadow-xs">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Receipt No</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Cashier</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Date / Time</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAll.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        <Search size={28} className="mx-auto mb-2 opacity-30" />
                        No purchase records match "{allSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredAll.map(t => (
                      <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{t.receipt_no}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{t.cashier}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{t.date}</td>
                        <td className="px-4 py-3 text-right text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</td>
                        <td className="px-4 py-3 text-center"><Badge variant="success">Completed</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <button onClick={() => handleSelectReceipt(t)} className="px-3 py-1.5 text-xs font-bold text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors cursor-pointer">View Receipt</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 border-t border-border px-6 py-3 bg-card flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredAll.length}</span> of {myTrx.length} transactions
              </p>
              <button
                onClick={() => setShowAllModal(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Modal ─── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-card text-foreground rounded-3xl w-full max-w-xs border border-border shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-5 text-center text-white">
              <Receipt size={32} className="mx-auto mb-1.5" />
              <h3 className="font-extrabold">Official Receipt</h3>
              <p className="text-emerald-200 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>{selected.receipt_no}</p>
            </div>
            <div className="p-5 space-y-3" style={{ fontFamily: "'DM Mono', monospace" }}>
              <div className="text-center border-b border-dashed border-border pb-3">
                <p className="font-extrabold text-lg text-foreground">SmartMart</p>
                <p className="text-xs text-muted-foreground">{selected.date}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cashier: {selected.cashier}</p>
              </div>
              <div className="space-y-1.5">
                {selectedItems.map(item => (
                  <div key={item.name} className="flex justify-between text-xs text-foreground">
                    <span>{item.name} ×{item.qty}</span>
                    <span>{peso(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-extrabold text-foreground"><span>TOTAL</span><span>{peso(Number(selected.total_amount))}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Cash</span><span>{peso(Number(selected.cash_tendered))}</span></div>
                <div className="flex justify-between font-extrabold text-emerald-500 text-sm"><span>Change</span><span>{peso(Number(selected.change_amount))}</span></div>
              </div>
              <p className="text-center text-xs text-muted-foreground border-t border-dashed border-border pt-3">Thank you for shopping at SmartMart!</p>
            </div>
            <div className="p-4 border-t border-border">
              <button onClick={() => { setSelected(null); setSelectedItems([]); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customer Profile ─────────────────────────────────────────────────────────

function CustomerProfile() {
  const user = getSavedUser();
  const username = user?.username || "";

  // Profile data from backend
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    middle_name: "",
    address: "",
    phone: "",
    gender: "",
    civil_status: "",
    date_of_birth: "",
    discount_type: "None" as "None" | "Senior Citizen" | "PWD",
    discount_id_no: "",
  });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [showAllPw, setShowAllPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [conPw, setConPw] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.customers.getMyProfile();
        if (mounted) setProfile(data);
      } catch (err: any) {
        console.error("Failed to load profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const startEditing = () => {
    if (!profile) return;
    setEditForm({
      first_name: profile.first_name,
      last_name: profile.last_name,
      middle_name: profile.middle_name || "",
      address: profile.address,
      phone: profile.phone,
      gender: profile.gender,
      civil_status: profile.civil_status,
      date_of_birth: profile.date_of_birth,
      discount_type: (profile.discount_type as any) || "None",
      discount_id_no: profile.discount_id_no || "",
    });
    setEditing(true);
    setProfileMsg(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setProfileMsg(null);
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    if (!editForm.first_name.trim()) { setProfileMsg({ type: "error", text: "First name is required." }); return; }
    if (!editForm.last_name.trim()) { setProfileMsg({ type: "error", text: "Last name is required." }); return; }
    if (!editForm.address.trim()) { setProfileMsg({ type: "error", text: "Address is required." }); return; }
    if (!editForm.phone.trim()) { setProfileMsg({ type: "error", text: "Phone is required." }); return; }
    if (!editForm.date_of_birth) { setProfileMsg({ type: "error", text: "Date of birth is required." }); return; }
    if (!editForm.gender) { setProfileMsg({ type: "error", text: "Gender is required." }); return; }
    if (!editForm.civil_status) { setProfileMsg({ type: "error", text: "Civil status is required." }); return; }
    if (editForm.discount_type !== "None" && !editForm.discount_id_no.trim()) {
      setProfileMsg({ type: "error", text: `${editForm.discount_type} ID number is required.` });
      return;
    }

    setSaving(true);
    try {
      const result = await api.customers.updateMyProfile({
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        middle_name: editForm.middle_name.trim() || undefined,
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        gender: editForm.gender,
        civil_status: editForm.civil_status,
        date_of_birth: editForm.date_of_birth,
        discount_type: editForm.discount_type,
        discount_id_no: editForm.discount_type !== "None" ? editForm.discount_id_no.trim() : null,
      });
      setProfile(result.profile);
      setEditing(false);

      // Update localStorage so header/sidebar show the new name
      const savedUser = getSavedUser();
      if (savedUser) {
        savedUser.name = `${result.profile.first_name} ${result.profile.last_name}`;
        localStorage.setItem("smartmart_user", JSON.stringify(savedUser));
      }

      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!curPw) { setErrorMsg("Please enter your current password."); return; }
    if (!newPw) { setErrorMsg("Please enter a new password."); return; }
    if (newPw.length < 6) { setErrorMsg("New password must be at least 6 characters."); return; }
    if (newPw !== conPw) { setErrorMsg("New passwords do not match."); return; }

    setUpdating(true);
    try {
      await api.auth.changePassword(curPw, newPw);
      setSuccessMsg("Password updated successfully!");
      setCurPw("");
      setNewPw("");
      setConPw("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setUpdating(false);
    }
  };

  const renderPwField = (label: string, value: string, onChange: (v: string) => void) => (
    <div key={label}>
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={showAllPw ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <button
          type="button"
          onClick={() => setShowAllPw(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAllPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : (user?.name || "Customer Account");
  const joined = profile?.joined || user?.joined || "Member";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>

      {/* Profile Message */}
      {profileMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          profileMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {profileMsg.type === "success" ? <CheckCircle size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
          {profileMsg.text}
        </div>
      )}

      {/* Customer Header Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 font-extrabold text-3xl">{displayName.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">@{username}</p>
            <span className="inline-block mt-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active Member
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-background rounded-xl border border-border">
            <p className="text-xs text-muted-foreground font-medium">Username</p>
            <p className="font-semibold text-foreground text-sm mt-0.5">@{username}</p>
          </div>
          <div className="p-3.5 bg-background rounded-xl border border-border">
            <p className="text-xs text-muted-foreground font-medium">Member Since</p>
            <p className="font-semibold text-foreground text-sm mt-0.5">{joined}</p>
          </div>
          {profile?.customer_code && (
            <div className="p-3.5 bg-background rounded-xl border border-border col-span-2">
              <p className="text-xs text-muted-foreground font-medium">Customer Code</p>
              <p className="font-semibold text-foreground text-sm mt-0.5 font-mono">{profile.customer_code}</p>
            </div>
          )}
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <User size={18} className="text-purple-600" />
            <h3 className="font-extrabold text-foreground text-base">Personal Information</h3>
          </div>
          {!editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border-2 border-purple-500 bg-purple-500 text-white hover:bg-purple-600 hover:border-purple-600 transition-all shadow-sm"
            >
              <Pencil size={14} />
              Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          /* ── Edit Mode ── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Middle Name</label>
                <input
                  type="text"
                  value={editForm.middle_name}
                  onChange={e => setEditForm(f => ({ ...f, middle_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  placeholder="Middle name (optional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                placeholder="Full address"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Phone <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Gender <span className="text-red-500">*</span></label>
                <select
                  value={editForm.gender}
                  onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Civil Status <span className="text-red-500">*</span></label>
                <select
                  value={editForm.civil_status}
                  onChange={e => setEditForm(f => ({ ...f, civil_status: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="">Select status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>
            </div>

            {/* Discount Eligibility in Edit Mode */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                Discount Eligibility (Senior Citizen / PWD)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["None", "Senior Citizen", "PWD"] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, discount_type: type, discount_id_no: type === "None" ? "" : f.discount_id_no }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                      editForm.discount_type === type
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type === "Senior Citizen" ? "Senior Citizen" : type}
                  </button>
                ))}
              </div>
              {editForm.discount_type !== "None" && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {editForm.discount_type === "Senior Citizen" ? "OSCA / Senior Citizen ID No." : "PWD ID No."}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.discount_id_no}
                    onChange={e => setEditForm(f => ({ ...f, discount_id_no: e.target.value }))}
                    placeholder="Enter ID number to verify discount eligibility"
                    className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    This ID number is verified by cashiers at checkout for automatic 5% billing discounts.
                  </p>
                </div>
              )}
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={cancelEditing}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          /* ── View Mode ── */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">First Name</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.first_name || "—"}</p>
              </div>
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">Last Name</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.last_name || "—"}</p>
              </div>
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">Middle Name</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.middle_name || "—"}</p>
              </div>
            </div>
            <div className="p-3.5 bg-background rounded-xl border border-border">
              <p className="text-xs text-muted-foreground font-medium">Address</p>
              <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.address || "—"}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">Phone</p>
                <p className="font-semibold text-foreground text-sm mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{profile?.phone || "—"}</p>
              </div>
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">Date of Birth</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.date_of_birth || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">Gender</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.gender || "—"}</p>
              </div>
              <div className="p-3.5 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">Civil Status</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{profile?.civil_status || "—"}</p>
              </div>
            </div>

            {/* Discount Status Box in View Mode */}
            <div className="p-4 bg-background rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Discount Category (Senior Citizen / PWD)</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {profile?.discount_type && profile.discount_type !== "None"
                      ? `${profile.discount_type} (5% Discount)`
                      : "Regular Customer (No Discount Registered)"}
                  </p>
                  {profile?.discount_id_no ? (
                    <p className="text-xs text-emerald-600 font-mono font-semibold mt-1">
                      Verified ID No: {profile.discount_id_no}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Present your ID in store or edit your profile to register for 5% discounts.
                    </p>
                  )}
                </div>
                {profile?.discount_type && profile.discount_type !== "None" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle size={13} /> 5% Active
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    Standard
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-emerald-600" />
          <h3 className="font-extrabold text-foreground text-base">Change Password</h3>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={15} className="shrink-0" />
            {successMsg}
          </div>
        )}

        {renderPwField("Current Password", curPw, setCurPw)}
        {renderPwField("New Password", newPw, setNewPw)}
        {renderPwField("Confirm New Password", conPw, setConPw)}

        <button
          onClick={handleUpdatePassword}
          disabled={updating}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
        >
          {updating ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}

// ─── Staff Profile Page ───────────────────────────────────────────────────────

function StaffProfile() {
  const savedUser = getSavedUser();
  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Mode state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(savedUser?.name || "Staff");
  const [username, setUsername] = useState(savedUser?.username || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [showAllPw, setShowAllPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleAllPw = () => setShowAllPw(v => !v);

  // Fetch live profile from backend stored procedure
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.staff.getMyProfile();
        if (mounted && data) {
          setProfile(data);
          setFullName(data.full_name);
          setUsername(data.username);
        }
      } catch (err: any) {
        console.warn("Could not fetch live staff profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleStartEditing = () => {
    setProfileMsg(null);
    setFullName(profile?.full_name || savedUser?.name || "");
    setUsername(profile?.username || savedUser?.username || "");
    setEditing(true);
  };

  const handleCancelEditing = () => {
    setProfileMsg(null);
    setFullName(profile?.full_name || savedUser?.name || "");
    setUsername(profile?.username || savedUser?.username || "");
    setEditing(false);
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);

    if (!fullName.trim()) {
      setProfileMsg({ type: "error", text: "Full Name is required." });
      return;
    }
    if (!username.trim()) {
      setProfileMsg({ type: "error", text: "Username is required." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.staff.updateMyProfile({
        full_name: fullName.trim(),
        username: username.trim(),
      });

      const updated = res.profile;
      setProfile(updated);
      setFullName(updated.full_name);
      setUsername(updated.username);

      // Update local storage user session
      if (savedUser) {
        const updatedUser: UserPayload = {
          ...savedUser,
          name: updated.full_name,
          username: updated.username,
        };
        localStorage.setItem("smartmart_user", JSON.stringify(updatedUser));
      }

      setProfileMsg({ type: "success", text: "Staff information and credentials updated successfully!" });
      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPw) { setErrorMsg("Please enter your current password."); return; }
    if (!newPw) { setErrorMsg("Please enter a new password."); return; }
    if (newPw.length < 6) { setErrorMsg("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setErrorMsg("New passwords do not match."); return; }

    setSubmitting(true);
    try {
      await api.auth.changePassword(currentPw, newPw);
      setSuccessMsg("Password updated successfully!");
      toast.success("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  const pwField = (label: string, value: string, onChange: (v: string) => void) => (
    <div key={label}>
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={showAllPw ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <button type="button" onClick={toggleAllPw} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {showAllPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  const displayName = profile?.full_name || savedUser?.name || "Staff";
  const displayUsername = profile?.username || savedUser?.username || "";
  const staffCode = profile?.staff_code || savedUser?.staff_code || `STF${String(savedUser?.id || 1).padStart(3, "0")}`;
  const joinedDate = profile?.joined || savedUser?.joined || "Aug 05, 2026";
  const roleName = profile?.role || "Cashier";
  const statusName = profile?.status || "Active";

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage staff account information and security</p>
        </div>
        {!editing && (
          <button
            onClick={handleStartEditing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Pencil size={15} /> Edit Profile
          </button>
        )}
      </div>

      {profileMsg && (
        <div className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-2.5 ${profileMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
          {profileMsg.type === "success" ? <CheckCircle size={18} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={18} className="text-red-500 shrink-0" />}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* Info / Edit Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-foreground text-base flex items-center gap-2">
                <Pencil size={16} className="text-emerald-500" /> Edit Staff Information
              </h3>
              <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">{staffCode}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Misa Amane"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Username (Login)</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. cashier1"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Role</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{roleName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Staff Code</p>
                <p className="font-semibold text-foreground text-sm font-mono mt-0.5">{staffCode}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingProfile && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{savingProfile ? "Saving Changes..." : "Save Changes"}</span>
              </button>
              <button
                onClick={handleCancelEditing}
                disabled={savingProfile}
                className="px-4 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-emerald-500 font-extrabold text-3xl">{displayName.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">{staffCode}</p>
                <div className="mt-1">
                  <Badge variant="success">{statusName}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Username</p>
                <p className="font-semibold text-foreground text-sm mt-1">{displayUsername}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Role</p>
                <p className="font-semibold text-foreground text-sm mt-1">{roleName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <p className="font-semibold text-foreground text-sm mt-1">{statusName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Joined</p>
                <p className="font-semibold text-foreground text-sm mt-1">{joinedDate}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Change password */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
        <h3 className="font-extrabold text-foreground text-base">Change Password</h3>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {pwField("Current Password", currentPw, setCurrentPw)}
        {pwField("New Password", newPw, setNewPw)}
        {pwField("Confirm New Password", confirmPw, setConfirmPw)}
        <button
          onClick={handleChangePassword}
          disabled={submitting}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <span>{submitting ? "Updating..." : "Update Password"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Admin Categories Page ────────────────────────────────────────────────────

const EMOJI_CHOICES = ["📦", "🥤", "🍟", "🍜", "🥫", "🍞", "🍫", "🥛", "🧂", "🧴", "💊", "🧹", "🍼", "✏️", "🧊", "🧼", "☕", "🥚"];

function AdminCategoriesPage({
  products, categories, catMeta, onAddCategory,
}: {
  products: Product[];
  categories: string[];
  catMeta: Record<string, { emoji: string; desc: string }>;
  onAddCategory: (name: string, emoji: string, desc: string) => void;
}) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState(EMOJI_CHOICES[0]);
  const [catMsg, setCatMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const selectedProds = selectedCat ? products.filter(p => p.category === selectedCat) : [];

  const resetForm = () => { setNewName(""); };

  const submitCategory = () => {
    const name = newName.trim();
    if (!name) { setCatMsg({ type: "error", text: "Please enter a category name." }); return; }
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      setCatMsg({ type: "error", text: `"${name}" already exists.` });
      return;
    }
    onAddCategory(name, "", "");
    setCatMsg({ type: "success", text: `Category "${name}" added successfully!` });
    setTimeout(() => setCatMsg(null), 5000);
    resetForm();
    setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-5 bg-background text-foreground min-h-full transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Categories</h1>
          <p className="text-muted-foreground text-sm">Manage product categories</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {catMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${catMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border border-rose-500/20 text-rose-500"}`}>
          {catMsg.type === "success" ? <CheckCircle size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
          {catMsg.text}
        </div>
      )}

      <div className="flex gap-5">
        {/* Category list */}
        <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${selectedCat ? "w-1/2" : "w-full"} transition-all`}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-xs text-muted-foreground font-extrabold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-center px-5 py-3">Products</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map(cat => {
                const catProds = products.filter(p => p.category === cat);
                const meta = catMeta[cat];
                const active = selectedCat === cat;
                return (
                  <tr key={cat} className={`transition-colors ${active ? "bg-emerald-500/10" : "hover:bg-muted/30"}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-foreground">{cat}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-foreground font-semibold">{catProds.length}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedCat(active ? null : cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ml-auto ${active ? "bg-emerald-600 text-white" : "text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white"}`}
                      >
                        <Package size={13} /> {active ? "Hide" : "View Products"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline product panel */}
        {selectedCat && (
          <div className="w-1/2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground">{selectedCat}</span>
                <span className="text-xs text-muted-foreground font-semibold">({selectedProds.length} products)</span>
              </div>
              <button onClick={() => setSelectedCat(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr className="text-xs text-muted-foreground font-extrabold uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-right px-5 py-3">Price</th>
                    <th className="text-right px-5 py-3">Stock</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedProds.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-semibold text-foreground">{p.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-foreground">{peso(p.price)}</td>
                      <td className={`px-5 py-3 text-right font-mono font-bold ${p.lowStock ? "text-rose-500" : "text-foreground"}`}>{p.stock}</td>
                      <td className="px-5 py-3 text-center">
                        {p.lowStock
                          ? <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Low</span>
                          : <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg text-foreground">Add Category</h3>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Category Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submitCategory(); }}
                  placeholder="e.g. Coffee & Tea"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-xs"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={submitCategory} className="flex-1 py-2.5 rounded-xl bg-[#22c55e] text-white text-sm font-bold hover:bg-[#16a34a] transition-colors">Add Category</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Sales Page ─────────────────────────────────────────────────────────

function AdminSalesPage() {
  const { transactions: storeTransactions, refreshData } = useStore();
  const [localTransactions, setLocalTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"today" | "week" | "month">("today");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await api.transactions.getAll();
        if (isMounted) setLocalTransactions(data);
      } catch (err) {
        console.error("Failed to load transactions for AdminSalesPage:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    refreshData();
    return () => { isMounted = false; };
  }, [refreshData]);

  const allTx = localTransactions.length > 0 ? localTransactions : storeTransactions;

  // Filter by period (today, week, month)
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    if (filter === "today") {
      return allTx.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d.getFullYear() === todayYear && d.getMonth() === todayMonth && d.getDate() === todayDate;
      });
    }

    if (filter === "week") {
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek + 6) % 7;
      const monday = new Date(todayYear, todayMonth, todayDate - diffToMon, 0, 0, 0, 0);
      const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return allTx.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d >= monday && d <= sunday;
      });
    }

    // month
    return allTx.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d.getFullYear() === todayYear && d.getMonth() === todayMonth;
    });
  }, [allTx, filter]);

  // Search filter
  const displayedTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredByPeriod;
    return filteredByPeriod.filter(t =>
      (t.receipt_no && t.receipt_no.toLowerCase().includes(q)) ||
      (t.customer && t.customer.toLowerCase().includes(q)) ||
      (t.cashier && t.cashier.toLowerCase().includes(q)) ||
      String(t.id).includes(q)
    );
  }, [filteredByPeriod, search]);

  // Stat metrics
  const totalRevenue = useMemo(() => {
    return filteredByPeriod.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  }, [filteredByPeriod]);

  const totalCount = filteredByPeriod.length;

  const uniqueCustomersCount = useMemo(() => {
    if (filteredByPeriod.length === 0) return 0;
    const names = filteredByPeriod.map(t => (t.customer || "Walk-in").trim());
    return new Set(names).size;
  }, [filteredByPeriod]);

  const handleSelectTransaction = async (t: TransactionItem) => {
    setSelectedTx(t);
    setLoadingItems(true);
    try {
      const items: any = await api.transactions.getItems(t.id);
      setSelectedItems(items.map((i: any) => ({
        name: i.product_name,
        qty: i.quantity,
        price: Number(i.unit_price),
      })));
    } catch {
      setSelectedItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleExportExcel = () => {
    const headers = ["Receipt No", "Customer", "Cashier", "Total Amount", "Cash Tendered", "Change", "Date & Time"];
    const rows = displayedTransactions.map(t => [
      t.receipt_no || `#${t.id}`,
      `"${(t.customer || 'Walk-in').replace(/"/g, '""')}"`,
      `"${(t.cashier || '').replace(/"/g, '""')}"`,
      Number(t.total_amount || 0).toFixed(2),
      Number(t.cash_tendered || 0).toFixed(2),
      Number(t.change_amount || 0).toFixed(2),
      `"${t.date || ''}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SmartMart_Sales_${filter}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sales report downloaded!");
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-5 bg-background text-foreground min-h-full transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Sales</h1>
          <p className="text-muted-foreground text-sm">Transaction history and revenue</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground text-sm font-bold rounded-xl hover:bg-muted transition-all shadow-sm">
            <Printer size={16} /> Export PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filter tabs & Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          {(["today", "week", "month"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${filter === f ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "today" ? "Today" : f === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search receipt, customer, cashier..."
            className="w-full pl-9 pr-4 py-2 bg-card text-foreground rounded-xl border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Total Revenue"
          value={peso(totalRevenue)}
          sub={filter === "today" ? "Today's sales" : filter === "week" ? "This week's sales" : "This month's sales"}
          color="green"
        />
        <StatCard
          icon={<Receipt size={20} />}
          label="Transactions"
          value={totalCount}
          sub="Completed sales"
          color="blue"
        />
        <StatCard
          icon={<User size={20} />}
          label="Unique Customers"
          value={uniqueCustomersCount}
          sub="Including walk-ins"
          color="purple"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr className="text-xs text-muted-foreground font-extrabold uppercase tracking-wide">
              <th className="text-left px-5 py-3">Receipt</th>
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-left px-5 py-3">Cashier</th>
              <th className="text-right px-5 py-3">Total</th>
              <th className="text-right px-5 py-3">Date & Time</th>
              <th className="text-right px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  {loading ? "Loading transactions..." : "No transactions found for this period."}
                </td>
              </tr>
            ) : (
              displayedTransactions.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs font-bold text-blue-500">
                    {t.receipt_no || `#${t.id}`}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {t.customer || "Walk-in"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {t.cashier}
                  </td>
                  <td className="px-5 py-3 text-right font-extrabold text-emerald-500" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {peso(Number(t.total_amount))}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground font-mono">
                    {t.date}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleSelectTransaction(t)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {selectedTx.receipt_no || `#${selectedTx.id}`}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedTx.date}</p>
              </div>
              <button onClick={() => { setSelectedTx(null); setSelectedItems([]); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selectedTx.customer || "Walk-in"}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground">Cashier</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selectedTx.cashier}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Purchased Items</p>
                {loadingItems ? (
                  <p className="text-xs text-muted-foreground py-2">Loading receipt items...</p>
                ) : selectedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No item breakdown available.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.name} <span className="text-muted-foreground">×{item.qty}</span></span>
                        <span className="font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5">
                <div className="flex justify-between font-extrabold text-foreground">
                  <span>Total</span>
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(selectedTx.total_amount))}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Cash</span>
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(selectedTx.cash_tendered))}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-emerald-500">
                  <span>Change</span>
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(selectedTx.change_amount))}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Badge variant="success">Completed</Badge>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Settings Page ──────────────────────────────────────────────────────

function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"store" | "account">("store");
  const { storeInfo, updateStoreInfo } = useStore();

  // Store info state — initialized from context
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [address, setAddress] = useState(storeInfo.address);
  const [contact, setContact] = useState(storeInfo.contact);
  const [email, setEmail] = useState(storeInfo.email);
  const [hours, setHours] = useState(storeInfo.hours);
  const [taxRate, setTaxRate] = useState(storeInfo.taxRate);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSuccessMsg, setStoreSuccessMsg] = useState("");
  const [storeErrorMsg, setStoreErrorMsg] = useState("");

  const handleSaveStoreInfo = async () => {
    setStoreSuccessMsg("");
    setStoreErrorMsg("");

    if (!storeName.trim()) {
      setStoreErrorMsg("Store Name is required.");
      return;
    }
    if (!address.trim()) {
      setStoreErrorMsg("Store Address is required.");
      return;
    }
    if (!contact.trim()) {
      setStoreErrorMsg("Contact Number is required.");
      return;
    }

    setStoreSaving(true);
    try {
      await updateStoreInfo({
        name: storeName.trim(),
        address: address.trim(),
        contact: contact.trim(),
        email: email.trim(),
        hours: hours.trim(),
        taxRate: String(taxRate),
      });
      setStoreSuccessMsg("Store information updated successfully!");
    } catch (err: any) {
      setStoreErrorMsg(err.message || "Failed to save store information.");
    } finally {
      setStoreSaving(false);
    }
  };

  // Account state
  const user = getSavedUser();
  const [adminName, setAdminName] = useState(user?.name || "Admin User");
  const [adminEmail, setAdminEmail] = useState(user?.username || "admin");
  const [showAllPw, setShowAllPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [conPw, setConPw] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const toggleAllPw = () => setShowAllPw(v => !v);

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-all placeholder:text-muted-foreground";
  const labelCls = "block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5";

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[#22c55e]" : "bg-muted border border-border"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-foreground rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );

  const ToggleRow = ({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );

  const renderPwField = (label: string, value: string, onChange: (v: string) => void) => (
    <div key={label}>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input type={showAllPw ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••••" className={`${inputCls} pr-11`} />
        <button type="button" onClick={toggleAllPw} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {showAllPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: "store" as const, label: "Store Info", icon: <Store size={15} /> },
    { id: "account" as const, label: "Account", icon: <User size={15} /> },
  ];

  return (
    <div className="p-6 space-y-5 bg-background text-foreground min-h-full">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage store configuration and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${activeTab === t.id ? "border-[#22c55e] text-[#22c55e]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-xl space-y-4">

        {/* ── Store Info ── */}
        {activeTab === "store" && (
          <>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Store size={17} className="text-[#22c55e]" />
                <h3 className="font-extrabold text-foreground">Store Information</h3>
              </div>

              {storeSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                  <span>{storeSuccessMsg}</span>
                </div>
              )}

              {storeErrorMsg && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle size={18} className="text-red-500 shrink-0" />
                  <span>{storeErrorMsg}</span>
                </div>
              )}

              {([["Store Name", storeName, setStoreName], ["Address", address, setAddress], ["Contact Number", contact, setContact], ["Email", email, setEmail], ["Business Hours", hours, setHours]] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <label className={labelCls}>{lbl}</label>
                  <input
                    value={val}
                    onChange={e => {
                      setter(e.target.value);
                      setStoreSuccessMsg("");
                      setStoreErrorMsg("");
                    }}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className={labelCls}>VAT / Tax Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => {
                    setTaxRate(e.target.value);
                    setStoreSuccessMsg("");
                    setStoreErrorMsg("");
                  }}
                  min="0"
                  max="100"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              onClick={handleSaveStoreInfo}
              disabled={storeSaving}
              className="px-6 py-2.5 bg-[#22c55e] text-white font-bold text-sm rounded-xl hover:bg-[#16a34a] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {storeSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{storeSaving ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </>
        )}

        {/* ── Account ── */}
        {activeTab === "account" && (
          <>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User size={17} className="text-[#22c55e]" />
                <h3 className="font-extrabold text-foreground">Admin Profile</h3>
              </div>
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
                <div className="w-14 h-14 rounded-2xl bg-[#22c55e] flex items-center justify-center shrink-0">
                  <span className="text-white font-extrabold text-2xl">{adminName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-extrabold text-foreground">{adminName}</p>
                  <p className="text-sm text-muted-foreground">{adminEmail}</p>
                  <span className="inline-block mt-1 text-xs font-bold text-[#22c55e] bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Administrator</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Full Name</label>
                <input value={adminName} onChange={e => setAdminName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Username</label>
                <input type="text" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={17} className="text-[#22c55e]" />
                <h3 className="font-extrabold text-foreground">Change Password</h3>
              </div>
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={15} className="shrink-0" />
                  {successMsg}
                </div>
              )}
              {renderPwField("Current Password", curPw, setCurPw)}
              {renderPwField("New Password", newPw, setNewPw)}
              {renderPwField("Confirm New Password", conPw, setConPw)}
            </div>

            <button
              disabled={pwdSubmitting}
              onClick={async () => {
                setErrorMsg("");
                setSuccessMsg("");
                if (!adminName.trim()) { setErrorMsg("Full Name cannot be empty."); return; }
                if (curPw || newPw || conPw) {
                  if (!curPw) { setErrorMsg("Please enter your current password."); return; }
                  if (!newPw) { setErrorMsg("Please enter a new password."); return; }
                  if (newPw.length < 6) { setErrorMsg("New password must be at least 6 characters."); return; }
                  if (newPw !== conPw) { setErrorMsg("New passwords do not match."); return; }
                  setPwdSubmitting(true);
                  try {
                    await api.auth.changePassword(curPw, newPw);
                    setSuccessMsg("Account password changed successfully!");
                    setCurPw(""); setNewPw(""); setConPw("");
                  } catch (err: any) {
                    setErrorMsg(err.message || "Failed to update password.");
                  } finally {
                    setPwdSubmitting(false);
                  }
                } else {
                  setSuccessMsg("Account profile updated successfully!");
                }
              }}
              className="px-6 py-2.5 bg-[#22c55e] text-white font-bold text-sm rounded-xl hover:bg-[#16a34a] transition-all shadow-sm disabled:opacity-50"
            >
              {pwdSubmitting ? "Saving..." : "Save Account Settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Layout Wrappers ──────────────────────────────────────────────────────────

function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<AdminPage>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("smartmart_sidebar_collapsed") === "true");
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("smartmart_sidebar_collapsed", String(next));
      return next;
    });
  };
  const { products, categories, catMeta, addProduct: handleAddProduct, addCategory: handleAddCategory, pendingCustomers, refreshData } = useStore();
  const [pendingReturns, setPendingReturns] = useState(0);

  const fetchPendingReturns = useCallback(() => {
    api.returns.getAll({ status: "Pending" })
      .then(res => setPendingReturns(Number(res.summary?.pending_count || 0)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPendingReturns();
    const interval = setInterval(fetchPendingReturns, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingReturns]);

  const PAGE_LABELS: Record<AdminPage, string> = {
    dashboard: "Dashboard", products: "Products", categories: "Categories",
    inventory: "Inventory", sales: "Sales", returns: "Product Returns", customers: "Customers",
    staff: "Staff", reports: "Reports", settings: "Settings",
  };

  const handleReturnsUpdated = useCallback(() => {
    fetchPendingReturns();
    refreshData();
  }, [fetchPendingReturns, refreshData]);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <AdminDashboard products={products} categories={categories} />;
      case "products": return <ProductsPage products={products} categories={categories} onAddProduct={handleAddProduct} />;
      case "categories": return <AdminCategoriesPage products={products} categories={categories} catMeta={catMeta} onAddCategory={handleAddCategory} />;
      case "inventory": return <InventoryPage products={products} categories={categories} catMeta={catMeta} />;
      case "sales": return <AdminSalesPage />;
      case "returns": return <ReturnsManagement role="admin" onReturnsUpdated={handleReturnsUpdated} />;
      case "staff": return <AdminStaffPage />;
      case "customers": return <CustomersPage />;
      case "reports": return <ReportsPage />;
      case "settings": return <AdminSettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors">
      <Sidebar
        role="admin"
        activePage={page}
        onNavigate={p => setPage(p as AdminPage)}
        onLogout={onLogout}
        userName="Admin User"
        pendingCount={pendingCustomers.length}
        pendingReturnsCount={pendingReturns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-5 shrink-0 shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold">Admin</span>
            <ChevronRight size={14} className="text-muted-foreground/50" />
            <span className="text-sm font-extrabold text-foreground">{PAGE_LABELS[page]}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-xs">A</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-hide">{renderPage()}</main>
      </div>
    </div>
  );
}

function StaffLayout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<StaffPage>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("smartmart_sidebar_collapsed") === "true");
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("smartmart_sidebar_collapsed", String(next));
      return next;
    });
  };
  const { products, categories, refreshData } = useStore();
  const user = getSavedUser();
  const displayName = user?.name || "Staff";
  const [pendingReturns, setPendingReturns] = useState(0);

  const fetchPendingReturns = useCallback(() => {
    api.returns.getAll({ status: "Pending" })
      .then(res => setPendingReturns(Number(res.summary?.pending_count || 0)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPendingReturns();
    const interval = setInterval(fetchPendingReturns, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingReturns]);

  const handleReturnsUpdated = useCallback(() => {
    fetchPendingReturns();
    refreshData();
  }, [fetchPendingReturns, refreshData]);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <StaffDashboard onNavigate={p => setPage(p)} products={products} />;
      case "pos": return <POSPage products={products} categories={categories} />;
      case "inventory": return <InventoryPage products={products} categories={categories} catMeta={CAT_META} />;
      case "transactions": return <TransactionsPage />;
      case "returns": return <ReturnsManagement role="staff" onReturnsUpdated={handleReturnsUpdated} />;
      case "profile": return <StaffProfile />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors">
      <Sidebar
        role="staff"
        activePage={page}
        onNavigate={p => setPage(p as StaffPage)}
        onLogout={onLogout}
        userName={displayName}
        pendingReturnsCount={pendingReturns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-5 shrink-0 transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-extrabold text-foreground">{page === "pos" ? "Point of Sale" : page === "inventory" ? "Inventory" : page === "transactions" ? "Today's Transactions" : page === "returns" ? "Product Returns" : page === "profile" ? "My Profile" : "Staff Dashboard"}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">{displayName.charAt(0)}</div>
          </div>
        </header>
        <main className={`flex-1 min-h-0 ${page === "pos" ? "overflow-hidden flex" : "overflow-y-auto scrollbar-hide"}`}>{renderPage()}</main>
      </div>
    </div>
  );
}

function CustomerLayout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<CustomerPage>("browse");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("smartmart_sidebar_collapsed") === "true");
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("smartmart_sidebar_collapsed", String(next));
      return next;
    });
  };
  const { products, categories } = useStore();
  const user = getSavedUser();
  const userName = user?.name || "Customer Account";

  const renderPage = () => {
    switch (page) {
      case "browse": return <CustomerBrowse products={products} categories={categories} />;
      case "history": return <CustomerHistory onNavigate={p => setPage(p)} />;
      case "analytics": return <CustomerAnalytics onNavigate={p => setPage(p as CustomerPage)} />;
      case "returns-history": return <CustomerReturnHistoryView />;
      case "profile": return <CustomerProfile />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors">
      <Sidebar
        role="customer"
        activePage={page}
        onNavigate={p => setPage(p as CustomerPage)}
        onLogout={onLogout}
        userName={userName}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-5 shrink-0 transition-colors">
          <span className="text-sm font-extrabold text-foreground">
            {page === "browse"
              ? "SmartMart Browse Catalog"
              : page === "history"
              ? "Purchase History"
              : page === "analytics"
              ? "My Spending Analytics"
              : page === "returns-history"
              ? "Return History"
              : "Customer Profile"}
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
              {userName.charAt(0)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-hide">{renderPage()}</main>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [role, setRole] = useState<Role>(() => {
    const saved = getSavedUser();
    return saved ? saved.role : "login";
  });

  const handleLogout = () => {
    api.auth.logout();
    setRole("login");
  };

  return (
    <>
      <StoreProvider>
        {role === "login" && <LoginScreen onLogin={setRole} />}
        {role === "admin" && <AdminLayout onLogout={handleLogout} />}
        {role === "staff" && <StaffLayout onLogout={handleLogout} />}
        {role === "customer" && <CustomerLayout onLogout={handleLogout} />}
      </StoreProvider>
    </>
  );
}
