import { useState, useMemo, useCallback, createContext, useContext, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { api, getSavedUser, UserPayload, RegisteredCustomer, CustomerProfileData, DashboardSummary, TransactionItem, StaffItem } from "../api";
import logoImg from "../assets/SmartMart_Logo.jpg";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  LogOut, Search, Plus, Minus, Trash2, Bell, AlertTriangle,
  TrendingUp, CheckCircle, X, User, ClipboardList, Store,
  Receipt, Settings, Printer, ChevronRight, ShieldCheck, Pencil,
  Eye, EyeOff, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "login" | "admin" | "staff" | "customer";
type AdminPage = "dashboard" | "products" | "inventory" | "categories" | "sales" | "customers" | "staff" | "reports" | "settings";
type StaffPage = "dashboard" | "pos" | "transactions" | "profile";
type CustomerPage = "browse" | "history" | "profile";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStock: boolean;
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
  Snacks: "bg-amber-100 text-amber-700",
  "Non-Alcoholic Beverages": "bg-blue-100 text-blue-700",
  "Alcoholic Beverages": "bg-amber-100 text-amber-800",
  "Instant Foods": "bg-orange-100 text-orange-700",
  "Canned Goods": "bg-red-100 text-red-700",
  "Bread & Bakery": "bg-yellow-100 text-yellow-700",
  "Candies & Chocolates": "bg-pink-100 text-pink-700",
  "Dairy Products": "bg-sky-100 text-sky-700",
  "Cooking Essentials": "bg-lime-100 text-lime-700",
  "Personal Care": "bg-purple-100 text-purple-700",
  "Household Essentials": "bg-teal-100 text-teal-700",
  "Health & Wellness": "bg-green-100 text-green-700",
  "Baby Products": "bg-rose-100 text-rose-700",
  "School & Office Supplies": "bg-violet-100 text-violet-700",
  "Frozen Foods": "bg-cyan-100 text-cyan-700",
  Miscellaneous: "bg-gray-100 text-gray-700",
};

const CAT_BG: Record<string, string> = {
  Snacks: "bg-amber-50",
  "Non-Alcoholic Beverages": "bg-blue-50",
  "Alcoholic Beverages": "bg-amber-50",
  "Instant Foods": "bg-orange-50",
  "Canned Goods": "bg-red-50",
  "Bread & Bakery": "bg-yellow-50",
  "Candies & Chocolates": "bg-pink-50",
  "Dairy Products": "bg-sky-50",
  "Cooking Essentials": "bg-lime-50",
  "Personal Care": "bg-purple-50",
  "Household Essentials": "bg-teal-50",
  "Health & Wellness": "bg-green-50",
  "Baby Products": "bg-rose-50",
  "School & Office Supplies": "bg-violet-50",
  "Frozen Foods": "bg-cyan-50",
  Miscellaneous: "bg-gray-50",
};

// ─── Custom Charts ────────────────────────────────────────────────────────────

interface ChartPoint { label: string; value: number; }

function SimpleBarChart({ data, height = 200, color = "#10b981", formatY }: {
  data: ChartPoint[]; height?: number; color?: string; formatY?: (v: number) => string;
}) {
  const safeData = data && data.length > 0 ? data : [{ label: "N/A", value: 0 }];
  const max = Math.max(1, ...safeData.map(d => d.value));
  const fmt = formatY ?? (v => `₱${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`);
  const svgH = height;
  const padT = 8; const padB = 28; const padL = 44; const padR = 8;
  const chartH = svgH - padT - padB;
  const barW = Math.min(32, Math.floor((800 - padL - padR) / safeData.length - 6));

  return (
    <div style={{ width: "100%", height: svgH }}>
      <svg width="100%" height={svgH} viewBox={`0 0 ${600} ${svgH}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = padT + chartH * (1 - f);
          return (
            <g key={`g-${f}`}>
              <line x1={padL} x2={600 - padR} y1={y} y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
              <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{fmt(max * f)}</text>
            </g>
          );
        })}
        {/* Bars */}
        {safeData.map((d, i) => {
          const slotW = (600 - padL - padR) / safeData.length;
          const x = padL + slotW * i + slotW / 2 - barW / 2;
          const barH = (d.value / max) * chartH;
          const y = padT + chartH - barH;
          return (
            <g key={`b-${i}`}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} rx={4} ry={4} opacity={0.85} />
              <rect x={x} y={y} width={barW} height={Math.min(4, barH)} fill={color} rx={4} ry={4} />
              <text x={x + barW / 2} y={svgH - 8} textAnchor="middle" fontSize={11} fill="#64748b">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SimpleLineChart({ data, height = 200, color = "#10b981", formatY }: {
  data: ChartPoint[]; height?: number; color?: string; formatY?: (v: number) => string;
}) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const fmt = formatY ?? (v => `₱${(v / 1000).toFixed(0)}K`);
  const svgH = height;
  const padT = 8; const padB = 28; const padL = 44; const padR = 16;
  const chartH = svgH - padT - padB;
  const chartW = 600 - padL - padR;

  const px = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const py = (v: number) => padT + chartH - ((v - min) / range) * chartH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(d.value)}`).join(" ");
  const areaD = `${pathD} L ${px(data.length - 1)} ${padT + chartH} L ${px(0)} ${padT + chartH} Z`;

  return (
    <div style={{ width: "100%", height: svgH }}>
      <svg width="100%" height={svgH} viewBox={`0 0 ${600} ${svgH}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lg-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const v = min + range * f;
          const y = py(v);
          return (
            <g key={`g-${f}`}>
              <line x1={padL} x2={600 - padR} y1={y} y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
              <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{fmt(v)}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaD} fill="url(#lg-area)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots + labels */}
        {data.map((d, i) => (
          <g key={`d-${i}`}>
            <circle cx={px(i)} cy={py(d.value)} r={4} fill={color} />
            <text x={px(i)} y={svgH - 8} textAnchor="middle" fontSize={11} fill="#64748b">{d.label}</text>
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
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
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
    green: { icon: "bg-green-50  text-[#22c55e]", bar: "bg-[#22c55e]" },
    blue: { icon: "bg-blue-50   text-blue-600", bar: "bg-blue-500" },
    amber: { icon: "bg-amber-50  text-amber-600", bar: "bg-amber-500" },
    purple: { icon: "bg-purple-50 text-purple-600", bar: "bg-purple-500" },
    red: { icon: "bg-red-50    text-red-600", bar: "bg-red-500" },
    gray: { icon: "bg-gray-100  text-gray-600", bar: "bg-gray-400" },
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg[color].icon}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-xl font-extrabold text-[#1f2937] mt-1 leading-tight truncate" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1 leading-tight">{sub}</p>}
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
    { id: "customers", icon: <User size={18} />, label: "Customers" },
    { id: "staff", icon: <Users size={18} />, label: "Staff" },
    { id: "reports", icon: <TrendingUp size={18} />, label: "Reports" },
    { id: "settings", icon: <Settings size={18} />, label: "Settings" },
  ],
  staff: [
    { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { id: "pos", icon: <ShoppingCart size={18} />, label: "Point of Sale" },
    { id: "transactions", icon: <Receipt size={18} />, label: "Transactions" },
    { id: "profile", icon: <User size={18} />, label: "My Profile" },
  ],
  customer: [
    { id: "browse", icon: <Store size={18} />, label: "Browse Products" },
    { id: "history", icon: <Receipt size={18} />, label: "Purchase History" },
    { id: "profile", icon: <User size={18} />, label: "My Profile" },
  ],
};

const ROLE_LABELS: Record<SidebarRole, string> = {
  admin: "Administrator",
  staff: "Cashier",
  customer: "Customer",
};

function Sidebar({ role, activePage, onNavigate, onLogout, userName, pendingCount = 0 }: {
  role: SidebarRole; activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void; userName: string;
  pendingCount?: number;
}) {
  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <aside className="w-64 min-h-screen flex flex-col shrink-0 bg-[#1f2937]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-md">
            <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-extrabold text-base leading-tight">SmartMart</p>
            <p className="text-gray-500 text-xs">{ROLE_LABELS[role]} Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS[role].map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activePage === item.id
              ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/20"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.id === "customers" && pendingCount > 0 && (
              <span className="w-5 h-5 bg-amber-400 text-[#1f2937] text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center text-white text-xs font-extrabold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
            <p className="text-gray-500 text-xs">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
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
      setTimeout(() => onLogin(res.user.role), 800);
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
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-[#1f2937] text-lg tracking-tight">SmartMart</span>
          </button>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-[#22c55e] font-semibold transition-colors">
            ← Back to Home
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1f2937]">SmartMart</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-semibold uppercase tracking-widest">Convenience Store Management System</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-extrabold text-[#1f2937] text-center mb-6">Welcome Back!</h2>

            {/* Inline Messages */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={14} className="shrink-0" />
                {successMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-bold text-[#1f2937] mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-[#1f2937] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#22c55e] cursor-pointer"
                />
                <span className="text-sm text-gray-600 font-medium">Remember Me</span>
              </label>
            </div>

            {/* Login button */}
            <button
              onClick={handleLogin}
              className="w-full mt-6 py-3.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold rounded-xl transition-all shadow-md text-sm tracking-wide"
            >
              Login
            </button>

            {/* Forgot password */}
            <div className="text-center mt-4">
              <a href="#" className="text-sm text-[#22c55e] font-semibold hover:underline">Forgot Password?</a>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Register */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Don&apos;t have an account?</p>
              <button
                onClick={onGoRegister}
                className="w-full py-3 border-2 border-[#22c55e] text-[#22c55e] font-extrabold rounded-xl hover:bg-[#22c55e] hover:text-white transition-all text-sm"
              >
                Register
              </button>
            </div>
          </div>

        </div>
      </div>
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

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-all";
  const selectCls = `${inputCls} text-[#1f2937]`;

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
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-[#1f2937] text-lg tracking-tight">SmartMart</span>
          </button>
          <p className="text-sm text-gray-500">
            Have an account?{" "}
            <button onClick={onGoLogin} className="text-[#22c55e] font-bold hover:underline">Sign in</button>
          </p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {submitted ? (
          <div className="w-full max-w-md text-center">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#1f2937] mb-2">Application Submitted!</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Your registration is now <span className="font-bold text-amber-600">pending approval</span>. Visit the SmartMart store and our staff will provide your login credentials once your account is approved.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6 space-y-1">
                <p className="text-xs font-extrabold text-amber-700 uppercase tracking-widest mb-2">What happens next?</p>
                <p className="text-xs text-amber-800">1. Admin reviews your registration</p>
                <p className="text-xs text-amber-800">2. Account gets approved</p>
                <p className="text-xs text-amber-800">3. Visit the store to receive your email & password</p>
                <p className="text-xs text-amber-800">4. Sign in and start shopping!</p>
              </div>
              <button onClick={onBack} className="w-full py-2.5 bg-[#22c55e] text-white font-bold rounded-xl hover:bg-[#16a34a] transition-colors text-sm">Back to Home</button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-7">
                <div className="w-14 h-14 rounded-2xl bg-[#facc15] flex items-center justify-center mx-auto mb-4 shadow-md">
                  <User size={26} className="text-[#1f2937]" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#1f2937]">Customer Registration</h1>
                <p className="text-gray-500 text-sm mt-1">Fill in your personal information to register</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Personal Information</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Last Name <span className="text-red-500">*</span></label>
                    <input value={lastName} onChange={e => { setLastName(e.target.value); setFormErrors(prev => ({ ...prev, lastName: "" })); }} placeholder="Dela Cruz" className={`${inputCls} ${formErrors.lastName ? "border-red-400 ring-2 ring-red-400/30" : ""}`} />
                    {formErrors.lastName && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">First Name <span className="text-red-500">*</span></label>
                    <input value={firstName} onChange={e => { setFirstName(e.target.value); setFormErrors(prev => ({ ...prev, firstName: "" })); }} placeholder="Juan" className={`${inputCls} ${formErrors.firstName ? "border-red-400 ring-2 ring-red-400/30" : ""}`} />
                    {formErrors.firstName && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.firstName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Middle Name <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                  <input value={middleName} onChange={e => { setMiddleName(e.target.value); setFormErrors(prev => ({ ...prev, middleName: "" })); }} placeholder="Santos" className={`${inputCls} ${formErrors.middleName ? "border-red-400 ring-2 ring-red-400/30" : ""}`} />
                  {formErrors.middleName && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.middleName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Address <span className="text-red-500">*</span></label>
                  <input value={address} onChange={e => { setAddress(e.target.value); setFormErrors(prev => ({ ...prev, address: "" })); }} placeholder="Brgy. Poblacion, Bilar, Bohol" className={`${inputCls} ${formErrors.address ? "border-red-400 ring-2 ring-red-400/30" : ""}`} />
                  {formErrors.address && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                    <input type="date" value={dob} onChange={e => { setDob(e.target.value); setFormErrors(prev => ({ ...prev, dob: "" })); }} className={`${inputCls} ${formErrors.dob ? "border-red-400 ring-2 ring-red-400/30" : ""}`} />
                    {formErrors.dob && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.dob}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Gender <span className="text-red-500">*</span></label>
                    <select value={gender} onChange={e => { setGender(e.target.value); setFormErrors(prev => ({ ...prev, gender: "" })); }} className={`${selectCls} ${formErrors.gender ? "border-red-400 ring-2 ring-red-400/30" : ""}`}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Prefer not to say</option>
                    </select>
                    {formErrors.gender && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.gender}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Civil Status <span className="text-red-500">*</span></label>
                    <select value={civilStatus} onChange={e => { setCivilStatus(e.target.value); setFormErrors(prev => ({ ...prev, civilStatus: "" })); }} className={`${selectCls} ${formErrors.civilStatus ? "border-red-400 ring-2 ring-red-400/30" : ""}`}>
                      <option value="">Select</option>
                      <option>Single</option>
                      <option>Married</option>
                      <option>Widowed</option>
                      <option>Separated</option>
                    </select>
                    {formErrors.civilStatus && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.civilStatus}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Phone Number <span className="text-red-500">*</span></label>
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
                      className={`${inputCls} ${formErrors.phone ? "border-red-400 ring-2 ring-red-400/30" : ""}`}
                    />
                    {formErrors.phone ? (
                      <p className="text-xs text-red-500 font-medium mt-1">{formErrors.phone}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Philippine mobile number (11 digits starting with 09)</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-400 pt-1">Fields marked with <span className="text-red-500">*</span> are required.</p>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-gray-400 text-white font-bold rounded-xl transition-all shadow-md text-sm mt-2 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Registration"
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <button onClick={onGoLogin} className="text-[#22c55e] font-bold hover:underline">Sign in</button>
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
};

const StoreContext = createContext<StoreValue | null>(null);

function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

function StoreProvider({ children }: { children: React.ReactNode }) {
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
        api.products.getAll(),
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
          price: Number(p.price),
          stock: p.stock,
          lowStock: p.stock <= (p.low_stock_threshold || 10),
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
      toast.success("Store settings updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
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
    () => ({ products, categories, catMeta, storeInfo, pendingCustomers, registeredCustomers, transactions, refreshData, addProduct, addCategory, updateStoreInfo, addPendingCustomer, approvePendingCustomer, denyPendingCustomer }),
    [products, categories, catMeta, storeInfo, pendingCustomers, registeredCustomers, transactions, refreshData, addProduct, addCategory, updateStoreInfo, addPendingCustomer, approvePendingCustomer, denyPendingCustomer],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ── Public Navbar shared across all public pages ───────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  const [page, setPage] = useState<"home" | "login" | "register">("home");
  const { storeInfo } = useStore();
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);

  const goLogin = () => setPage("login");
  const goRegister = () => setPage("register");

  if (page === "login") return <LoginPage onLogin={onLogin} onBack={() => setPage("home")} onGoRegister={goRegister} />;
  if (page === "register") return <RegisterPage onLogin={onLogin} onBack={() => setPage("home")} onGoLogin={goLogin} />;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
              <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-[#1f2937] text-lg tracking-tight">SmartMart</span>
          </div>
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-500">
            <a href="#" className="hover:text-[#22c55e] transition-colors">Home</a>
            <a href="#about" className="hover:text-[#22c55e] transition-colors">About</a>
            <a href="#contact" className="hover:text-[#22c55e] transition-colors">Contact</a>
          </nav>
          {/* CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={goLogin} className="text-sm font-bold text-[#1f2937] hover:text-[#22c55e] px-4 py-2 rounded-xl hover:bg-green-50 transition-all">Login</button>
            <button onClick={goRegister} className="text-sm font-bold bg-[#22c55e] text-white px-4 py-2 rounded-xl hover:bg-[#16a34a] transition-all shadow-sm">Register</button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative bg-[#1f2937] text-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#facc15]" />
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none" aria-hidden="true">
          <div className="absolute top-8 left-10 text-[120px]">🛒</div>
          <div className="absolute top-12 right-20 text-[90px]">🥤</div>
          <div className="absolute bottom-12 left-1/4 text-[80px]">🍜</div>
          <div className="absolute bottom-8 right-1/3 text-[100px]">🧴</div>
          <div className="absolute top-1/2 right-12 text-[70px]">🍪</div>
          <div className="absolute top-1/3 left-1/2 text-[60px]">🥛</div>
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
          <span className="inline-flex items-center gap-2 bg-[#22c55e]/20 text-[#22c55e] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <Store size={12} /> Welcome to SmartMart
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight">
            Your Smart<br /><span className="text-[#22c55e]">Convenience Store</span>
          </h1>
          <p className="mt-6 text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
            A smarter way to shop at your neighborhood convenience store. Create an account to browse products, check stock availability, and view your purchase history.
          </p>
        </div>
      </section>

      {/* ── Why Join SmartMart ── */}
      <section id="about" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">Benefits</span>
            <h2 className="text-3xl font-extrabold text-[#1f2937] mt-2">Why Join SmartMart?</h2>
            <p className="text-gray-500 text-sm mt-2">Create a free account and get access to everything SmartMart has to offer.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {([
              ["📦", "Real-Time Product Availability", "Know if your favorite products are in stock before visiting."],
              ["🛒", "Faster In-Store Shopping", "Browse products in advance to save time at the store."],
              ["🧾", "Digital Purchase History", "View all your previous purchases anytime, anywhere."],
              ["👤", "Secure Customer Account", "Manage your profile and keep all shopping records safe."],
            ] as [string, string, string][]).map(([icon, title, desc]) => (
              <div key={title} className="bg-[#f9fafb] rounded-2xl border border-gray-200 p-6 flex flex-col gap-3 hover:shadow-md hover:border-[#22c55e] transition-all">
                <span className="text-4xl">{icon}</span>
                <p className="font-extrabold text-[#1f2937] text-sm leading-snug">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 bg-[#f9fafb]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">Simple steps</span>
            <h2 className="text-3xl font-extrabold text-[#1f2937] mt-2">How SmartMart Works</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-0">
            {([
              ["1️⃣", "Create an Account", "Register for free in seconds."],
              ["2️⃣", "Browse Products", "Explore 34+ products across 17 categories."],
              ["3️⃣", "Visit the Store", "Come in knowing exactly what you need."],
              ["4️⃣", "Pay at the Cashier", "Our staff processes your purchase via POS."],
              ["5️⃣", "View Purchase History", "Track all your transactions in your dashboard."],
            ] as [string, string, string][]).map(([num, title, desc], i, arr) => (
              <div key={title} className="flex flex-col sm:flex-row items-center gap-0 flex-1">
                <div className="flex flex-col items-center text-center px-4 py-2 flex-1">
                  <span className="text-3xl mb-2">{num}</span>
                  <p className="font-extrabold text-[#1f2937] text-sm">{title}</p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-[120px]">{desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden sm:flex flex-col items-center shrink-0">
                    <div className="w-8 h-0.5 bg-[#22c55e]" />
                    <span className="text-[#22c55e] text-xs font-bold mt-1">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={goRegister} className="px-10 py-3.5 bg-[#22c55e] text-white font-bold rounded-xl hover:bg-[#16a34a] transition-all text-sm shadow-lg">
              Get Started — It&apos;s Free
            </button>
          </div>
        </div>
      </section>

      {/* ── Store Information ── */}
      <section id="store-info" className="py-20 px-6 bg-[#1f2937]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">Find us</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">Store Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              ["📍", "Address", storeInfo.address],
              ["📞", "Contact Number", `${storeInfo.contact}\n${storeInfo.email}`],
              ["🕒", "Store Hours", `Monday – Sunday\n${storeInfo.hours}`],
            ] as [string, string, string][]).map(([icon, label, detail]) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
                <span className="text-3xl">{icon}</span>
                <p className="text-[#22c55e] text-xs font-extrabold uppercase tracking-widest">{label}</p>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-[#111827] pt-10 pb-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 pb-8 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                  <img src={logoImg} alt="SmartMart Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-extrabold text-white text-base">SmartMart</span>
              </div>
              <p className="text-gray-500 text-xs max-w-[200px] leading-relaxed">Your trusted neighborhood convenience store.</p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div>
                <p className="text-white font-bold text-xs uppercase tracking-widest mb-3">Company</p>
                <div className="flex flex-col gap-2">
                  {[["About", "#about"], ["Store Information", "#store-info"], ["Contact", "#contact"]].map(([l, h]) => (
                    <a key={l} href={h} className="text-gray-500 hover:text-[#22c55e] text-xs transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white font-bold text-xs uppercase tracking-widest mb-3">Legal</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setLegalModal("privacy")} className="text-gray-500 hover:text-[#22c55e] text-xs transition-colors text-left">Privacy Policy</button>
                  <button onClick={() => setLegalModal("terms")} className="text-gray-500 hover:text-[#22c55e] text-xs transition-colors text-left">Terms & Conditions</button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 text-xs mt-6">© 2026 SmartMart. All rights reserved.</p>
        </div>
      </footer>

      {/* Legal Modals */}
      {legalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-extrabold text-lg text-[#1f2937]">
                {legalModal === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
              </h2>
              <button onClick={() => setLegalModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4 text-sm text-gray-600 leading-relaxed">
              {legalModal === "privacy" ? (
                <>
                  <p>SmartMart ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our convenience store management system.</p>
                  <h3 className="font-extrabold text-[#1f2937]">1. Information We Collect</h3>
                  <p>We collect information you provide directly, such as your name, email address, phone number, and purchase history when you register and use our platform.</p>
                  <h3 className="font-extrabold text-[#1f2937]">2. How We Use Your Information</h3>
                  <p>Your information is used to manage your account, process transactions, and improve our services. We do not sell or share your personal data with third parties.</p>
                  <h3 className="font-extrabold text-[#1f2937]">3. Data Security</h3>
                  <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, or disclosure.</p>
                  <h3 className="font-extrabold text-[#1f2937]">4. Your Rights</h3>
                  <p>You have the right to access, correct, or request deletion of your personal data. Contact us at {storeInfo.email} for any privacy-related concerns.</p>
                  <h3 className="font-extrabold text-[#1f2937]">5. Contact Us</h3>
                  <p>For questions about this Privacy Policy, reach us at {storeInfo.address} or call {storeInfo.contact}.</p>
                </>
              ) : (
                <>
                  <p>By accessing or using SmartMart's platform, you agree to be bound by these Terms & Conditions. Please read them carefully before using our services.</p>
                  <h3 className="font-extrabold text-[#1f2937]">1. Use of Service</h3>
                  <p>SmartMart is a convenience store management system. Access is granted by role (Admin, Staff, or Customer) and must not be shared or misused.</p>
                  <h3 className="font-extrabold text-[#1f2937]">2. Account Responsibility</h3>
                  <p>You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.</p>
                  <h3 className="font-extrabold text-[#1f2937]">3. Purchases & Transactions</h3>
                  <p>All sales made through the POS system are final. Refunds or disputes must be raised directly at the store within 24 hours of the transaction.</p>
                  <h3 className="font-extrabold text-[#1f2937]">4. Prohibited Activities</h3>
                  <p>Users may not attempt to access unauthorized areas of the system, manipulate inventory data, or use the platform for any unlawful purpose.</p>
                  <h3 className="font-extrabold text-[#1f2937]">5. Changes to Terms</h3>
                  <p>SmartMart reserves the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.</p>
                  <h3 className="font-extrabold text-[#1f2937]">6. Contact</h3>
                  <p>For questions, contact us at {storeInfo.address} or call {storeInfo.contact}.</p>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setLegalModal(null)} className="w-full py-2.5 bg-[#22c55e] text-white font-bold text-sm rounded-xl hover:bg-[#16a34a] transition-colors">Close</button>
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
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#1f2937] text-lg leading-tight">Low Stock Alerts</h2>
              <p className="text-xs text-gray-400 mt-0.5">{items.length} products need restocking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0 flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search low stock items..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-red-400/30"
          >
            <option value="All">All Categories</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No items match your filter.</p>
          ) : filtered.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100 hover:border-red-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1f2937] truncate">{p.name}</p>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${CAT_COLORS[p.category] ?? "bg-gray-100 text-gray-600"}`}>{p.category}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold text-red-600 leading-tight" style={{ fontFamily: "'DM Mono', monospace" }}>{p.stock}</p>
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">units left</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-400 font-semibold">Showing {filtered.length} of {items.length} low stock items</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-[#1f2937] text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-colors">Close</button>
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
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Receipt size={18} className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#1f2937] text-lg leading-tight">All Transactions</h2>
              <p className="text-xs text-gray-400 mt-0.5">{transactions.length} transactions recorded</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by receipt ID, customer, or cashier..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
            />
          </div>
        </div>
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
              <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="text-left px-6 py-3">Receipt</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Cashier</th>
                <th className="text-left px-6 py-3">Items</th>
                <th className="text-right px-6 py-3">Total</th>
                <th className="text-right px-6 py-3">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No transactions match your search.</td>
                </tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-blue-600 font-bold">{t.id}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-[11px] font-extrabold text-[#22c55e] shrink-0">
                        {t.customer === "Walk-in" ? "?" : t.customer[0]}
                      </div>
                      <span className="text-[#1f2937] font-medium">{t.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 text-xs">{t.cashier}</td>
                  <td className="px-6 py-3.5 text-gray-500 text-xs">{t.items.length} item{t.items.length !== 1 ? "s" : ""}</td>
                  <td className="px-6 py-3.5 text-right font-extrabold text-[#22c55e]" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(t.total)}</td>
                  <td className="px-6 py-3.5 text-right text-xs text-gray-400">{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-400 font-semibold">Showing {filtered.length} of {transactions.length} transactions</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-[#1f2937] text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-colors">Close</button>
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
    if (transactions.length === 0) {
      if (chartTab === "yearly") {
        return [{ label: "Jan", value: 0 }, { label: "Feb", value: 0 }, { label: "Mar", value: 0 }];
      }
      return [
        { label: "Mon", value: 0 }, { label: "Tue", value: 0 }, { label: "Wed", value: 0 },
        { label: "Thu", value: 0 }, { label: "Fri", value: 0 }, { label: "Sat", value: 0 }, { label: "Sun", value: 0 }
      ];
    }
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const dateObj = new Date(t.date);
      let d = "";
      if (chartTab === "daily") {
        d = dateObj.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
      } else if (chartTab === "monthly") {
        d = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else if (chartTab === "yearly") {
        d = dateObj.toLocaleDateString("en-US", { month: "short" });
      } else { // weekly
        d = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      }
      map[d] = (map[d] || 0) + Number(t.total_amount || 0);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [transactions, chartTab]);

  const totalProductsCount = summary?.total_products ?? products.length;
  const totalCategoriesCount = summary?.total_categories ?? categories.length;
  const totalCustomersCount = summary?.total_customers ?? 0;
  const activeStaffCount = summary?.active_staff ?? 0;
  const lowStockCount = summary?.low_stock_count ?? lowStock.length;

  return (
    <div className="p-6 space-y-6 bg-[#f9fafb] min-h-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#1f2937]">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{today}</p>
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-[#1f2937]">Sales Overview</h3>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(["daily", "weekly", "monthly", "yearly"] as const).map(tab => (
                <button key={tab} onClick={() => setChartTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${chartTab === tab ? "bg-white text-[#1f2937] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <SimpleBarChart data={chartData} height={200} />
        </div>

        {/* Best Sellers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-[#22c55e]" />
            <h3 className="font-extrabold text-[#1f2937]">Best Selling Products</h3>
          </div>
          {(!summary?.best_sellers || summary.best_sellers.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <TrendingUp size={20} />
              </div>
              <p className="text-sm font-bold text-[#1f2937]">No Items Sold Yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Best selling products will be tracked live here as POS sales occur.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.best_sellers.map((item, i) => (
                <div key={item.id || item.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                    i === 1 ? "bg-slate-100 text-slate-700 border border-slate-200" :
                      i === 2 ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-gray-50 text-gray-600"
                    }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1f2937] truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 font-medium">{item.total_sold} {item.total_sold === 1 ? "unit" : "units"} sold</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 font-mono shrink-0">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="font-extrabold text-[#1f2937]">Low Stock Alerts</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{lowStock.length} items</span>
            </div>
          </div>
          <div className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">All products are well stocked.</p>
            ) : lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1f2937] truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category}</p>
                </div>
                <span className="text-sm font-extrabold text-red-600 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-blue-500" />
              <h3 className="font-extrabold text-[#1f2937]">Recent Transactions</h3>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No recent transactions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="text-left pb-2">Receipt</th>
                    <th className="text-left pb-2">Customer</th>
                    <th className="text-left pb-2">Cashier</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 font-mono text-xs text-blue-600">{t.receipt_no || `TRX-${t.id}`}</td>
                      <td className="py-2.5 text-[#1f2937] font-medium">{t.customer || "Walk-in"}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{t.cashier || "Staff"}</td>
                      <td className="py-2.5 text-right font-extrabold text-[#22c55e]" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</td>
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newCat, setNewCat] = useState(categories[0]);
  const [productMsg, setProductMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = () => {
    if (!newName.trim() || !newPrice || !newStock) return;
    const name = newName.trim();
    onAddProduct({ name, category: newCat, price: parseFloat(newPrice), stock: parseInt(newStock) });
    setProductMsg({ type: "success", text: `Product "${name}" added successfully!` });
    setTimeout(() => setProductMsg(null), 5000);
    setNewName(""); setNewPrice(""); setNewStock(""); setNewCat(categories[0]);
    setShowAdd(false);
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
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">
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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["Product", "Category", "Price", "Stock", "Status"].map(h => (
                <th key={h} className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider ${h === "Price" ? "px-4 py-3 text-right" : h === "Stock" ? "px-4 py-3 text-center" : "px-4 py-3 text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{p.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${CAT_COLORS[p.category] ?? "bg-gray-100 text-gray-700"}`}>{p.category}</span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(p.price)}</td>
                <td className={`px-4 py-3 text-center text-sm font-bold ${p.lowStock ? "text-red-500" : "text-foreground"}`} style={{ fontFamily: "'DM Mono', monospace" }}>{p.stock}</td>
                <td className="px-4 py-3 text-left">{p.lowStock ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">In Stock</Badge>}</td>
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

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg text-foreground">Add New Product</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Product Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Piattos Cheese 85g" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Price (₱)</label>
                <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" min="0" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Stock Quantity</label>
                <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Category</label>
                <select value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors">Add Product</button>
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
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");

  const lowCount = products.filter(p => p.lowStock).length;

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat === "All" || p.category === selectedCat;
    const mf = stockFilter === "all" || p.lowStock;
    return ms && mc && mf;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Inventory</h1>
        <p className="text-muted-foreground text-sm">Monitor and restock product levels by category</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 text-center">
          <p className="text-3xl font-extrabold text-foreground">{products.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Products</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5 text-center">
          <p className="text-3xl font-extrabold text-red-500">{lowCount}</p>
          <p className="text-sm text-red-600 mt-1">Low Stock</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-200 p-5 text-center">
          <p className="text-3xl font-extrabold text-[#22c55e]">{products.length - lowCount}</p>
          <p className="text-sm text-green-700 mt-1">Well Stocked</p>
        </div>
      </div>

      {/* Search + category dropdown + stock filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
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
          <option value="All">All</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
          className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${stockFilter === "low" ? "bg-red-500 text-white border-red-500" : "bg-card text-muted-foreground border-border hover:border-gray-400"}`}
        >
          Low Stock
        </button>
      </div>

      {/* Product table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            {selectedCat === "All" ? "All Products" : (
              <span className="flex items-center gap-2">
                <span>{catMeta[selectedCat]?.emoji ?? "📦"}</span>
                {selectedCat}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>
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
                <td className="px-4 py-3 text-right text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace", color: p.lowStock ? "#ef4444" : "#0f172a" }}>{p.stock} units</td>
                <td className="px-4 py-3 text-center">{p.lowStock ? <Badge variant="danger">Restock Needed</Badge> : <Badge variant="success">OK</Badge>}</td>
                <td className="px-4 py-3 text-right">
                  <button className="px-3 py-1.5 text-xs font-bold text-[#22c55e] border border-[#22c55e] bg-white hover:bg-[#22c55e] hover:text-white rounded-lg transition-all">+ Restock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <p className="text-xs text-muted-foreground font-medium mb-1">Temporary Password (Initial)</p>
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
    </div>
  );
}

// ─── Customers Page ───────────────────────────────────────────────────────────

function CustomersPage() {
  const { pendingCustomers, registeredCustomers, approvePendingCustomer, denyPendingCustomer } = useStore();
  const [tab, setTab] = useState<"registered" | "pending">("registered");
  const [approveTarget, setApproveTarget] = useState<PendingCustomer | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [customerMsg, setCustomerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<RegisteredCustomer | null>(null);
  const [showViewCustPw, setShowViewCustPw] = useState(false);
  const [custCredsMap, setCustCredsMap] = useState<Record<string, string>>({});

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
                        <p className="text-sm font-semibold text-foreground">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{c.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.phone}</td>
                  <td className="px-4 py-3"><Badge variant="info">{c.customer_code}</Badge></td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.total_purchases}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.joined}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setViewingCustomer(c); setShowViewCustPw(false); }}
                      className="px-4 py-1.5 text-xs font-bold rounded-xl border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-sm"
                    >
                      View
                    </button>
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
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
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
            <div className="space-y-3">
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Full Name</p>
                <p className="font-bold text-foreground">{viewingCustomer.full_name}</p>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Customer Code</p>
                <p className="font-bold text-foreground font-mono">{viewingCustomer.customer_code}</p>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Username</p>
                <p className="font-bold text-foreground font-mono">{viewingCustomer.username}</p>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Temporary Password (Initial)</p>
                {(viewingCustomer.temp_password || custCredsMap[viewingCustomer.username]) ? (
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground font-mono flex-1">
                      {showViewCustPw ? (viewingCustomer.temp_password || custCredsMap[viewingCustomer.username]) : "••••••••"}
                    </p>
                    <button type="button" onClick={() => setShowViewCustPw(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {showViewCustPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No temporary password recorded</p>
                )}
              </div>
              <div className="p-4 bg-background rounded-xl border border-border flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Phone</p>
                  <p className="font-semibold text-foreground text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>{viewingCustomer.phone}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Member Since</p>
                  <p className="font-semibold text-foreground text-sm">{viewingCustomer.joined}</p>
                </div>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Gender</p>
                  <p className="font-semibold text-foreground text-sm">{viewingCustomer.gender}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Civil Status</p>
                  <p className="font-semibold text-foreground text-sm">{viewingCustomer.civil_status}</p>
                </div>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Address</p>
                <p className="font-semibold text-foreground text-sm">{viewingCustomer.address}</p>
              </div>
              <div className="pt-2">
                <button onClick={() => setViewingCustomer(null)} className="w-full py-2.5 rounded-xl bg-[#1f2937] text-white text-sm font-bold hover:bg-[#374151] transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

type ReportTab = "sales" | "inventory" | "customers";

function ReportsPage({ products = [] }: { products?: Product[] }) {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [selectedInventoryCat, setSelectedInventoryCat] = useState<string>("All");
  const [_loading, setLoading] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<RegisteredCustomer[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [sumRes, txRes, custRes] = await Promise.allSettled([
          api.dashboard.getSummary(),
          api.transactions.getAll(),
          api.customers.getRegistered(),
        ]);
        if (!isMounted) return;
        if (sumRes.status === "fulfilled") setDashboardSummary(sumRes.value);
        if (txRes.status === "fulfilled") setTransactions(txRes.value);
        if (custRes.status === "fulfilled") setRegisteredCustomers(custRes.value);
      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const todaySalesVal = dashboardSummary ? Number(dashboardSummary.today_sales || 0) : 0;
  const totalTransactionsCount = transactions.length;
  const totalRevenue = transactions.reduce((s, t) => s + Number(t.total_amount || 0), 0);

  const inventoryCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  const filteredInventory = useMemo(() => {
    if (selectedInventoryCat === "All") return products;
    return products.filter(p => p.category === selectedInventoryCat);
  }, [products, selectedInventoryCat]);

  const monthlyChartData = useMemo(() => {
    if (transactions.length === 0) {
      return [
        { label: "Mon", value: 0 },
        { label: "Tue", value: 0 },
        { label: "Wed", value: 0 },
        { label: "Thu", value: 0 },
        { label: "Fri", value: 0 },
        { label: "Sat", value: 0 },
        { label: "Sun", value: 0 },
      ];
    }
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      const d = t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today";
      map[d] = (map[d] || 0) + Number(t.total_amount || 0);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [transactions]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm">Business analytics and live performance reports</p>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {([["sales", "Sales"], ["inventory", "Inventory"], ["customers", "Customers"]] as [ReportTab, string][]).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === val ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">Today's Sales</p>
              <p className="text-2xl font-extrabold text-foreground mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(todaySalesVal)}</p>
              <Badge variant="success">Live</Badge>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-extrabold text-foreground mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{totalTransactionsCount}</p>
              <Badge variant="info">Completed</Badge>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-extrabold text-foreground mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(totalRevenue)}</p>
              <Badge variant="success">Recorded</Badge>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold text-foreground mb-4">Revenue Trend</h3>
            <SimpleBarChart data={monthlyChartData} height={240} />
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold text-foreground mb-4">Recent Sales Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No completed sales transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground font-semibold uppercase">
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Cashier</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>{t.receipt_no || `TRX-${t.id}`}</td>
                        <td className="py-2.5 px-3">{t.customer || "Walk-in"}</td>
                        <td className="py-2.5 px-3">{t.cashier || "Staff"}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">{t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Today"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                <Package size={20} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Inventory Overview</h3>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredInventory.length} of {products.length} products
                  {selectedInventoryCat !== "All" && ` in ${selectedInventoryCat}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                <Filter size={14} className="text-emerald-600" />
                Category:
              </label>
              <select
                value={selectedInventoryCat}
                onChange={(e) => setSelectedInventoryCat(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-sm"
              >
                <option value="All">All Categories ({products.length} products)</option>
                {inventoryCategories.map((cat) => {
                  const count = products.filter(p => p.category === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInventory.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${CAT_COLORS[p.category] ?? "bg-gray-100 text-gray-700"}`}>{p.category}</span></td>
                    <td className="px-4 py-3 text-right text-sm font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(p.price)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace", color: p.lowStock ? "#ef4444" : "#0f172a" }}>{p.stock}</td>
                    <td className="px-4 py-3 text-center">{p.lowStock ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">OK</Badge>}</td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                      No products found in category "{selectedInventoryCat}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "customers" && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-bold text-foreground mb-4">Registered Customer Report</h3>
          {registeredCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No registered customer accounts yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Purchases</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registeredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3">
                      <p className="text-sm font-semibold text-foreground">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>Code: {c.customer_code || c.username}</p>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.phone}</td>
                    <td className="py-3 text-right text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.total_purchases || 0}</td>
                    <td className="py-3 text-right text-sm text-muted-foreground">{c.joined ? new Date(c.joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

  const filtered = useMemo(() =>
    products.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase());
      const mc = category === "All" || p.category === category;
      return ms && mc && p.stock > 0;
    }), [products, search, category]);

  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cash = parseFloat(cashAmount) || 0;
  const change = Math.max(0, cash - total);
  const canComplete = cart.length > 0 && cash >= total;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
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
    try {
      const apiItems = cart.map(i => ({ product_id: i.product.id, quantity: i.qty }));
      let resTrx: any = null;
      try {
        resTrx = await api.transactions.create({
          customer_id: linkedCustomer ? linkedCustomer.id : null,
          cashier_id: 1,
          cash_tendered: cash,
          items: apiItems,
        });
      } catch (e) {
        console.warn("Backend transaction save error, fallback to local display:", e);
      }

      const trx: Transaction = {
        id: resTrx?.receipt_no || `TRX-2026-${Math.floor(Math.random() * 9000) + 1000}`,
        customer: linkedCustomer?.full_name ?? "Walk-in",
        customerId: linkedCustomer?.customer_code,
        items: cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
        total, cash, change: resTrx ? Number(resTrx.change_amount) : change,
        date: resTrx ? resTrx.date : new Date().toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        cashier: resTrx ? resTrx.cashier : (getSavedUser()?.name || "Cashier"),
      };
      setCompletedTrx(trx);
      setShowReceipt(true);
      toast.success(linkedCustomer ? `Transaction completed for ${linkedCustomer.full_name}!` : "Transaction completed!");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete transaction");
    }
  };

  const clearTransaction = () => {
    setCart([]); setLinkedCustomer(null); setCustSearch(""); setCashAmount("");
    setShowReceipt(false); setCompletedTrx(null);
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
              return (
                <button key={product.id} onClick={() => addToCart(product)} className={`relative p-3.5 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${inCart ? "border-emerald-500 bg-emerald-50" : "border-border bg-card hover:border-emerald-300"}`}>
                  {inCart && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 text-white text-xs font-extrabold rounded-full flex items-center justify-center">{inCart.qty}</span>
                  )}
                  <div className={`w-10 h-10 rounded-xl mb-2.5 flex items-center justify-center ${CAT_BG[product.category] ?? "bg-gray-50"}`}>
                    <Package size={18} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-sm font-extrabold text-emerald-600 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(product.price)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.stock} left</p>
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
          <h3 className="font-extrabold text-foreground">Current Order</h3>
          <p className="text-xs text-muted-foreground">{cart.reduce((s, i) => s + i.qty, 0)} item(s)</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
              <ShoppingCart size={28} className="opacity-20 mb-2" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs">Tap products to add them</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-2 p-3 bg-background rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(item.product.price)} each</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-full bg-muted hover:bg-slate-200 flex items-center justify-center transition-colors"><Minus size={10} /></button>
                  <span className="w-6 text-center text-sm font-extrabold" style={{ fontFamily: "'DM Mono', monospace" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded-full bg-muted hover:bg-slate-200 flex items-center justify-center transition-colors"><Plus size={10} /></button>
                </div>
                <span className="text-sm font-bold w-14 text-right shrink-0 text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(item.product.price * item.qty)}</span>
                <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0"><Trash2 size={12} /></button>
              </div>
            ))
          )}
        </div>

        {/* Customer lookup */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Customer (Optional)</p>
          {linkedCustomer ? (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{(linkedCustomer.full_name || "C").charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{linkedCustomer.full_name}</p>
                <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: "'DM Mono', monospace" }}>{linkedCustomer.customer_code} • @{linkedCustomer.username}</p>
              </div>
              <button onClick={() => { setLinkedCustomer(null); setCustSearch(""); }} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>
            </div>
          ) : (
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Search customer name or ID..." className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
              {custResults.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {custResults.map(c => (
                    <button key={c.id} onClick={() => { setLinkedCustomer(c); setCustSearch(""); }} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">{(c.full_name || "C").charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: "'DM Mono', monospace" }}>{c.customer_code} • @{c.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="p-4 border-t border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-foreground">TOTAL</span>
            <span className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(total)}</span>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cash Tendered</label>
            <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0.00" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-border bg-background text-xl font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30" style={{ fontFamily: "'DM Mono', monospace" }} />
            <div className="flex gap-1.5 mt-2">
              {[50, 100, 500, 1000].map(amt => (
                <button key={amt} onClick={() => setCashAmount(String(amt))} className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-muted hover:bg-slate-200 transition-colors">₱{amt}</button>
              ))}
            </div>
          </div>

          {cash >= total && cash > 0 && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-sm font-bold text-emerald-700">Change</span>
              <span className="text-xl font-extrabold text-emerald-700" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(change)}</span>
            </div>
          )}
          {cash > 0 && cash < total && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
              <span className="text-sm font-bold text-red-600">Short by</span>
              <span className="text-sm font-extrabold text-red-600" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(total - cash)}</span>
            </div>
          )}

          <button onClick={completeTransaction} disabled={!canComplete} className={`w-full py-3.5 rounded-2xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${canComplete ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
            <CheckCircle size={16} />
            Complete Transaction
          </button>
          {cart.length > 0 && (
            <button onClick={clearTransaction} className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors">Clear Order</button>
          )}
        </div>
      </div>

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
                <div className="flex justify-between font-extrabold text-sm text-foreground"><span>TOTAL</span><span>{peso(completedTrx.total)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Cash</span><span>{peso(completedTrx.cash)}</span></div>
                <div className="flex justify-between text-sm font-extrabold text-emerald-600"><span>Change</span><span>{peso(completedTrx.change)}</span></div>
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
    </div>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────────

function StaffDashboard({ onNavigate, products = INITIAL_PRODUCTS }: { onNavigate: (p: StaffPage) => void; products?: Product[] }) {
  const todayTotal = TRANSACTIONS.reduce((s, t) => s + t.total, 0);
  const lowStock = products.filter(p => p.lowStock).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Good afternoon, Maria!</h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Receipt size={20} />} label="Today's Transactions" value={TRANSACTIONS.length} sub="All completed" color="green" />
        <StatCard icon={<TrendingUp size={20} />} label="Today's Sales" value={peso(todayTotal)} color="blue" />
        <StatCard icon={<Package size={20} />} label="Products Available" value={products.length} sub={`${lowStock} low on stock`} color="purple" />
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-extrabold text-foreground mb-4">Today's Transactions</h3>
        <div className="space-y-2.5">
          {TRANSACTIONS.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3.5 bg-background rounded-xl">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle size={15} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t.customer}</p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{t.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(t.total)}</p>
                <p className="text-xs text-muted-foreground">{t.date.split(" ").slice(-2).join(" ")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Transactions Page ────────────────────────────────────────────────────────

function TransactionsPage() {
  const { transactions, refreshData } = useStore();
  const [selected, setSelected] = useState<TransactionItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSelectTransaction = async (t: TransactionItem) => {
    setSelected(t);
    setLoadingItems(true);
    try {
      const items: any = await api.transactions.getItems(t.id);
      setSelectedItems(items.map((i: any) => ({
        name: i.product_name,
        qty: i.quantity,
        price: Number(i.unit_price)
      })));
    } catch {
      setSelectedItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Transactions</h1>
        <p className="text-muted-foreground text-sm">Total — {transactions.length} records</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full">
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
          <tbody className="divide-y divide-border">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No transactions found</td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{t.receipt_no}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{t.customer}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{t.cashier}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{t.date}</td>
                  <td className="px-4 py-3 text-right text-sm font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(Number(t.total_amount))}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="success">Completed</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleSelectTransaction(t)} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">View Receipt</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
    <div className="p-6 space-y-5">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-2xl p-6 text-white">
        <p className="text-emerald-200 text-sm font-semibold">Welcome back,</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{customerName}</h1>
        <p className="text-emerald-100 text-sm mt-1.5">Browse products before your visit to the store.</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="text-emerald-200" />
          <span className="text-xs text-emerald-100 font-medium">Walk-in only · All purchases completed at the cashier</span>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none">
          <option>All</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(p => (
          <button key={p.id} onClick={() => setSelected(p)} className="bg-card rounded-2xl border border-border p-4 text-left hover:shadow-md hover:border-emerald-300 transition-all group">
            <div className={`w-full aspect-square rounded-xl mb-3 flex items-center justify-center ${CAT_BG[p.category] ?? "bg-gray-50"}`}>
              <Package size={28} className="text-slate-400 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{p.name}</p>
            <p className="text-base font-extrabold text-emerald-600 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(p.price)}</p>
            <div className="mt-1.5 flex flex-col gap-1">
              {p.stock > 10 ? <Badge variant="success">In Stock</Badge> : p.stock > 0 ? <Badge variant="warning">Low Stock</Badge> : <Badge variant="danger">Out of Stock</Badge>}
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{p.stock > 0 ? `${p.stock} units available` : "No stock"}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-foreground text-base">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className={`w-full h-40 rounded-2xl mb-5 flex items-center justify-center ${CAT_BG[selected.category] ?? "bg-gray-50"}`}>
              <Package size={60} className="text-slate-300" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${CAT_COLORS[selected.category] ?? "bg-gray-100 text-gray-700"}`}>{selected.category}</span>
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
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Visit us in-store to purchase this product. Online purchasing is not available.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customer History ─────────────────────────────────────────────────────────

function CustomerHistory() {
  const [myTrx, setMyTrx] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TransactionItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);

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
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Purchase History</h1>
        <p className="text-muted-foreground text-sm">{myTrx.length} transactions on record</p>
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
          {myTrx.map(t => (
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
                <button onClick={() => handleSelectReceipt(t)} className="text-emerald-600 font-bold hover:underline">View Receipt</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-5 text-center text-white">
              <Receipt size={32} className="mx-auto mb-1.5" />
              <h3 className="font-extrabold">Official Receipt</h3>
              <p className="text-emerald-200 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>{selected.receipt_no}</p>
            </div>
            <div className="p-5 space-y-3" style={{ fontFamily: "'DM Mono', monospace" }}>
              <div className="text-center border-b border-dashed pb-3">
                <p className="font-extrabold text-lg">SmartMart</p>
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
              <div className="border-t border-dashed pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-extrabold text-foreground"><span>TOTAL</span><span>{peso(Number(selected.total_amount))}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Cash</span><span>{peso(Number(selected.cash_tendered))}</span></div>
                <div className="flex justify-between font-extrabold text-emerald-600 text-sm"><span>Change</span><span>{peso(Number(selected.change_amount))}</span></div>
              </div>
              <p className="text-center text-xs text-muted-foreground border-t border-dashed pt-3">Thank you for shopping at SmartMart!</p>
            </div>
            <div className="p-4">
              <button onClick={() => { setSelected(null); setSelectedItems([]); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-colors">Close</button>
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
  const user = getSavedUser();
  const [showAllPw, setShowAllPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleAllPw = () => setShowAllPw(v => !v);

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

  const displayName = user?.name || "Staff";
  const displayUsername = user?.username || "";
  const staffCode = user?.staff_code || `STF${String(user?.id || 1).padStart(3, "0")}`;
  const joinedDate = user?.joined || "Aug 05, 2026";

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>

      {/* Info card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 font-extrabold text-3xl">{displayName.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{staffCode}</p>
            <div className="mt-1">
              <Badge variant="success">Active</Badge>
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
            <p className="font-semibold text-foreground text-sm mt-1">Cashier</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Status</p>
            <p className="font-semibold text-foreground text-sm mt-1">Active</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Joined</p>
            <p className="font-semibold text-foreground text-sm mt-1">{joinedDate}</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-extrabold text-foreground">Change Password</h3>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {pwField("Current Password", currentPw, setCurrentPw)}
        {pwField("New Password", newPw, setNewPw)}
        {pwField("Confirm New Password", confirmPw, setConfirmPw)}
        <button
          onClick={handleChangePassword}
          disabled={submitting}
          className="px-4 py-2.5 bg-[#0f172a] text-white rounded-xl text-sm font-bold hover:bg-[#1e293b] transition-colors disabled:opacity-50"
        >
          {submitting ? "Updating..." : "Update Password"}
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
    <div className="p-6 space-y-5 bg-[#f9fafb] min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1f2937]">Categories</h1>
          <p className="text-gray-500 text-sm">Manage product categories</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-white text-sm font-bold rounded-xl hover:bg-[#16a34a] transition-all shadow-sm">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {catMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${catMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {catMsg.type === "success" ? <CheckCircle size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
          {catMsg.text}
        </div>
      )}

      <div className="flex gap-5">
        {/* Category list */}
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${selectedCat ? "w-1/2" : "w-full"} transition-all`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 font-extrabold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-center px-5 py-3">Products</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(cat => {
                const catProds = products.filter(p => p.category === cat);
                const meta = catMeta[cat];
                const active = selectedCat === cat;
                return (
                  <tr key={cat} className={`transition-colors ${active ? "bg-green-50" : "hover:bg-gray-50"}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-[#1f2937]">{cat}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-[#1f2937]">{catProds.length}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedCat(active ? null : cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ml-auto ${active ? "bg-[#22c55e] text-white" : "text-[#22c55e] border border-[#22c55e] hover:bg-[#22c55e] hover:text-white"}`}
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
          <div className="w-1/2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#1f2937]">{selectedCat}</span>
                <span className="text-xs text-gray-400 font-semibold">({selectedProds.length} products)</span>
              </div>
              <button onClick={() => setSelectedCat(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr className="text-xs text-gray-500 font-extrabold uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-right px-5 py-3">Price</th>
                    <th className="text-right px-5 py-3">Stock</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedProds.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-[#1f2937]">{p.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-[#1f2937]">{peso(p.price)}</td>
                      <td className={`px-5 py-3 text-right font-mono font-bold ${p.lowStock ? "text-red-500" : "text-[#1f2937]"}`}>{p.stock}</td>
                      <td className="px-5 py-3 text-center">
                        {p.lowStock
                          ? <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Low</span>
                          : <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">OK</span>}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg text-[#1f2937]">Add Category</h3>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1.5">Category Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submitCategory(); }}
                  placeholder="e.g. Coffee & Tea"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-all"
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

function AdminSalesPage({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<"today" | "week" | "month">("today");
  const total = transactions.reduce((s, t) => s + t.total, 0);
  return (
    <div className="p-6 space-y-5 bg-[#f9fafb] min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1f2937]">Sales</h1>
          <p className="text-gray-500 text-sm">Transaction history and revenue</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">Export PDF</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-white text-sm font-bold rounded-xl hover:bg-[#16a34a] transition-all shadow-sm">Export Excel</button>
        </div>
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["today", "week", "month"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all capitalize ${filter === f ? "bg-[#22c55e] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            {f === "today" ? "Today" : f === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp size={20} />} label="Total Revenue" value={peso(total)} sub="All transactions" color="green" />
        <StatCard icon={<Receipt size={20} />} label="Transactions" value={transactions.length} sub="Completed sales" color="blue" />
        <StatCard icon={<User size={20} />} label="Unique Customers" value={new Set(transactions.map(t => t.customer)).size} sub="Including walk-ins" color="purple" />
      </div>
      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 font-extrabold uppercase tracking-wide">
              <th className="text-left px-5 py-3">Receipt</th>
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-left px-5 py-3">Cashier</th>
              <th className="text-right px-5 py-3">Total</th>
              <th className="text-right px-5 py-3">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-blue-600">{t.id}</td>
                <td className="px-5 py-3 font-medium text-[#1f2937]">{t.customer}</td>
                <td className="px-5 py-3 text-gray-500">{t.cashier}</td>
                <td className="px-5 py-3 text-right font-extrabold text-[#22c55e]" style={{ fontFamily: "'DM Mono', monospace" }}>{peso(t.total)}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-400">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-all";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[#22c55e]" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );

  const ToggleRow = ({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-[#1f2937]">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );

  const renderPwField = (label: string, value: string, onChange: (v: string) => void) => (
    <div key={label}>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input type={showAllPw ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••••" className={`${inputCls} pr-11`} />
        <button type="button" onClick={toggleAllPw} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
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
    <div className="p-6 space-y-5 bg-[#f9fafb] min-h-full">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1f2937]">Settings</h1>
        <p className="text-gray-500 text-sm">Manage store configuration and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${activeTab === t.id ? "border-[#22c55e] text-[#22c55e]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-xl space-y-4">

        {/* ── Store Info ── */}
        {activeTab === "store" && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Store size={17} className="text-[#22c55e]" />
                <h3 className="font-extrabold text-[#1f2937]">Store Information</h3>
              </div>
              {([["Store Name", storeName, setStoreName], ["Address", address, setAddress], ["Contact Number", contact, setContact], ["Email", email, setEmail], ["Business Hours", hours, setHours]] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <label className={labelCls}>{lbl}</label>
                  <input value={val} onChange={e => setter(e.target.value)} className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>VAT / Tax Rate (%)</label>
                <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} min="0" max="100" className={inputCls} />
              </div>
            </div>
            <button onClick={() => { updateStoreInfo({ name: storeName, address, contact, email, hours, taxRate }); }} className="px-6 py-2.5 bg-[#22c55e] text-white font-bold text-sm rounded-xl hover:bg-[#16a34a] transition-all shadow-sm">
              Save Changes
            </button>
          </>
        )}

        {/* ── Account ── */}
        {activeTab === "account" && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User size={17} className="text-[#22c55e]" />
                <h3 className="font-extrabold text-[#1f2937]">Admin Profile</h3>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-[#22c55e] flex items-center justify-center shrink-0">
                  <span className="text-white font-extrabold text-2xl">{adminName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-extrabold text-[#1f2937]">{adminName}</p>
                  <p className="text-sm text-gray-400">{adminEmail}</p>
                  <span className="inline-block mt-1 text-xs font-bold text-[#22c55e] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Administrator</span>
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

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={17} className="text-[#22c55e]" />
                <h3 className="font-extrabold text-[#1f2937]">Change Password</h3>
              </div>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
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
  const { products, categories, catMeta, addProduct: handleAddProduct, addCategory: handleAddCategory, pendingCustomers } = useStore();

  const PAGE_LABELS: Record<AdminPage, string> = {
    dashboard: "Dashboard", products: "Products", categories: "Categories",
    inventory: "Inventory", sales: "Sales", customers: "Customers",
    staff: "Staff", reports: "Reports", settings: "Settings",
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <AdminDashboard products={products} categories={categories} />;
      case "products": return <ProductsPage products={products} categories={categories} onAddProduct={handleAddProduct} />;
      case "categories": return <AdminCategoriesPage products={products} categories={categories} catMeta={catMeta} onAddCategory={handleAddCategory} />;
      case "inventory": return <InventoryPage products={products} categories={categories} catMeta={catMeta} />;
      case "sales": return <AdminSalesPage transactions={TRANSACTIONS} />;
      case "staff": return <AdminStaffPage />;
      case "customers": return <CustomersPage />;
      case "reports": return <ReportsPage products={products} />;
      case "settings": return <AdminSettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9fafb]">
      <Sidebar role="admin" activePage={page} onNavigate={p => setPage(p as AdminPage)} onLogout={onLogout} userName="Admin User" pendingCount={pendingCustomers.length} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-semibold">Admin</span>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-extrabold text-[#1f2937]">{PAGE_LABELS[page]}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#22c55e] flex items-center justify-center shadow-sm">
            <span className="text-white font-extrabold text-sm">A</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-hide">{renderPage()}</main>
      </div>
    </div>
  );
}

function StaffLayout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<StaffPage>("dashboard");
  const { products, categories } = useStore();
  const user = getSavedUser();
  const displayName = user?.name || "Staff";

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <StaffDashboard onNavigate={p => setPage(p)} products={products} />;
      case "pos": return <POSPage products={products} categories={categories} />;
      case "transactions": return <TransactionsPage />;
      case "profile": return <StaffProfile />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="staff" activePage={page} onNavigate={p => setPage(p as StaffPage)} onLogout={onLogout} userName={displayName} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-5 shrink-0">
          <span className="text-sm font-extrabold text-foreground">{page === "pos" ? "Point of Sale" : page === "transactions" ? "Today's Transactions" : page === "profile" ? "My Profile" : "Staff Dashboard"}</span>
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-extrabold">{displayName.charAt(0)}</div>
        </header>
        <main className={`flex-1 min-h-0 ${page === "pos" ? "overflow-hidden flex" : "overflow-y-auto scrollbar-hide"}`}>{renderPage()}</main>
      </div>
    </div>
  );
}

function CustomerLayout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<CustomerPage>("browse");
  const { products, categories } = useStore();
  const user = getSavedUser();
  const userName = user?.name || "Customer Account";

  const renderPage = () => {
    switch (page) {
      case "browse": return <CustomerBrowse products={products} categories={categories} />;
      case "history": return <CustomerHistory />;
      case "profile": return <CustomerProfile />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="customer" activePage={page} onNavigate={p => setPage(p as CustomerPage)} onLogout={onLogout} userName={userName} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-5 shrink-0">
          <span className="text-sm font-extrabold text-foreground">SmartMart Customer Portal</span>
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-extrabold">
            {userName.charAt(0)}
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
