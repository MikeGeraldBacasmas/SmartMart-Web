// Backend origin is injected at build time from VITE_API_URL (.env.development / .env.production).
// Falls back to the local dev server when not set.
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const API_BASE = `${API_ORIGIN}/api`;

// Resolve a backend-relative asset path (e.g. "/uploads/products/x.jpg") to a full URL.
export const resolveBackendUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

export interface UserPayload {
  id: number;
  username: string;
  role: "admin" | "staff" | "customer";
  name: string;
  staff_code?: string;
  joined?: string;
}

export interface LoginResponse {
  token: string;
  user: UserPayload;
}

export interface CategoryItem {
  id: number;
  name: string;
  product_count?: number;
}

export interface ProductItem {
  id: number;
  name: string;
  category: string;
  category_id?: number;
  price: number | string;
  cost_price?: number | string;
  stock: number;
  low_stock_threshold?: number;
  low_stock?: number | boolean;
  is_active?: number;
  image_url?: string | null;
}

export interface StaffItem {
  id: number;
  staff_code: string;
  full_name: string;
  role: string;
  status: "Active" | "Inactive";
  joined?: string;
  username?: string;
  temp_password?: string;
}

export interface StaffProfileData {
  id: number;
  user_id: number;
  staff_code: string;
  full_name: string;
  role: string;
  status: string;
  joined: string;
  username: string;
}

export interface DamageIncident {
  id: number;
  incident_no: string;
  product_id: number;
  product_name: string;
  category?: string;
  staff_id: number;
  staff_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reason: string;
  notes?: string | null;
  consequence_type: string;
  consequence_status: string;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateDamagePayload {
  product_id: number;
  quantity: number;
  reason: string;
  notes?: string;
  unit_cost?: number;
}

export interface RegisteredCustomer {
  id: number;
  customer_code: string;
  full_name: string;
  phone: string;
  address: string;
  gender: string;
  civil_status: string;
  date_of_birth: string;
  joined: string;
  username: string;
  temp_password?: string;
  total_purchases: number;
  discount_type?: "None" | "Senior Citizen" | "PWD";
  discount_id_no?: string | null;
}

export interface PendingCustomer {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  address: string;
  date_of_birth: string;
  civil_status: string;
  gender: string;
  phone: string;
  submitted_at: string;
}

export interface TransactionItem {
  id: number;
  receipt_no: string;
  customer: string;
  cashier: string;
  subtotal_amount?: number | string;
  discount_type?: "None" | "Senior Citizen" | "PWD";
  discount_id_no?: string | null;
  discount_amount?: number | string;
  total_amount: number | string;
  cash_tendered: number | string;
  change_amount: number | string;
  date: string;
  items?: Array<{
    id: number;
    product_id: number;
    product_name: string;
    unit_price: number | string;
    quantity: number;
    purchased_quantity?: number;
    already_returned?: number;
    available_quantity?: number;
    is_returnable?: boolean;
    is_fully_returned?: boolean;
  }>;
  returnable_items?: Array<{
    id: number;
    product_id: number;
    product_name: string;
    unit_price: number | string;
    quantity: number;
    available_quantity?: number;
  }>;
  is_fully_returned?: boolean;
  has_returned_items?: boolean;
  items_summary?: string;
  returnable_items_summary?: string;
  elapsed_minutes?: number;
  elapsed_hours?: number;
  return_window_hours?: number;
  is_return_window_expired?: boolean;
  return_window_error?: string | null;
}

export interface CustomerPurchasedItem {
  item_id: number;
  transaction_id: number;
  receipt_no: string;
  created_at: string;
  date_ymd: string;
  year_month: string;
  year: string;
  month_label: string;
  month_short: string;
  month_num: string;
  formatted_date: string;
  product_id: number;
  product_name: string;
  category_id?: number;
  category: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  returned_quantity?: number;
  item_refund_amount?: number;
}

export interface CustomerReturnItem {
  return_item_id: number;
  return_id: number;
  transaction_item_id: number;
  return_no: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Cancelled";
  reason: string;
  customer_notes?: string | null;
  admin_notes?: string | null;
  created_at: string;
  date_ymd: string;
  year_month: string;
  year: string;
  month_label: string;
  month_short: string;
  month_num: string;
  formatted_date: string;
  product_id: number;
  product_name: string;
  category_id?: number;
  category: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  receipt_no: string;
  transaction_id: number;
}

export interface CustomerReturnRecord {
  id: number;
  return_no: string;
  transaction_id: number;
  receipt_no: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Cancelled";
  reason: string;
  customer_notes?: string | null;
  admin_notes?: string | null;
  refund_amount: number;
  date_ymd: string;
  year_month: string;
  year: string;
  month_label: string;
  created_at: string;
  item_count: number;
  total_items_quantity: number;
}

export interface CustomerAnalyticsResponse {
  items: CustomerPurchasedItem[];
  transactions: Array<{
    id: number;
    receipt_no: string;
    total_amount: number;
    date_ymd: string;
    year_month: string;
    year: string;
    month_label: string;
    date: string;
  }>;
  return_items?: CustomerReturnItem[];
  returns?: CustomerReturnRecord[];
}

export interface BestSellerItem {
  id: number;
  name: string;
  price: number | string;
  cost_price?: number | string;
  total_sold: number;
  total_revenue: number | string;
}

export interface DashboardSummary {
  total_products: number;
  total_categories: number;
  total_customers: number;
  active_staff: number;
  low_stock_count: number;
  today_sales: string | number;
  today_transactions: number;
  pending_registrations: number;
  best_sellers?: BestSellerItem[];
}

function getToken(): string | null {
  return localStorage.getItem("smartmart_token");
}

export function getSavedUser(): UserPayload | null {
  const data = localStorage.getItem("smartmart_user");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 25-second timeout controller (allows cloud server wake-up/cold start and database connection)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const resData = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(resData.error || `Request failed with status ${response.status}`);
    }

    return resData as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check server connection.");
    }
    throw err;
  }
}

export interface CustomerProfileData {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  address: string;
  phone: string;
  gender: string;
  civil_status: string;
  date_of_birth: string;
  joined: string;
  username: string;
  discount_type?: "None" | "Senior Citizen" | "PWD";
  discount_id_no?: string | null;
}

export const api = {
  // Auth
  auth: {
    login: async (username: string, password: string): Promise<LoginResponse> => {
      const data = await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("smartmart_token", data.token);
      localStorage.setItem("smartmart_user", JSON.stringify(data.user));
      return data;
    },
    logout: () => {
      localStorage.removeItem("smartmart_token");
      localStorage.removeItem("smartmart_user");
    },
    changePassword: (currentPassword: string, newPassword: string): Promise<{ message: string }> =>
      request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  // Dashboard
  dashboard: {
    getSummary: (): Promise<DashboardSummary> => request<DashboardSummary>("/dashboard"),
  },

  // Categories
  categories: {
    getAll: (): Promise<CategoryItem[]> => request<CategoryItem[]>("/categories"),
    create: (name: string): Promise<{ category_id: number; name: string }> =>
      request("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
  },

  // Products
  products: {
    getAll: (): Promise<ProductItem[]> => request<ProductItem[]>("/products"),
    getPublic: (): Promise<ProductItem[]> => request<ProductItem[]>("/products/public"),
    getBestSellers: (limit: number = 8): Promise<any[]> => request<any[]>(`/products/best-sellers?limit=${limit}`),
    getLowStock: (): Promise<ProductItem[]> => request<ProductItem[]>("/products/low-stock"),
    create: (data: { name: string; category_id: number; price: number; stock: number; cost_price?: number }): Promise<ProductItem> =>
      request("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStock: (id: number, stock: number): Promise<{ message: string }> =>
      request(`/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stock }),
      }),
    update: (id: number, data: { name: string; category_id: number; price: number; stock: number; cost_price?: number; image_url?: string | null }): Promise<{ message: string }> =>
      request(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    uploadImage: async (id: number, file: File): Promise<{ image_url: string }> => {
      const token = getToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_BASE}/products/${id}/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
  },

  // Customers
  customers: {
    getRegistered: (): Promise<RegisteredCustomer[]> => request<RegisteredCustomer[]>("/customers"),
    getPending: (): Promise<PendingCustomer[]> => request<PendingCustomer[]>("/customers/pending"),
    getMyProfile: (): Promise<CustomerProfileData> => request<CustomerProfileData>("/customers/my-profile"),
    updateMyProfile: (data: {
      first_name: string;
      last_name: string;
      middle_name?: string;
      address: string;
      phone: string;
      gender: string;
      civil_status: string;
      date_of_birth: string;
      discount_type?: "None" | "Senior Citizen" | "PWD";
      discount_id_no?: string | null;
    }): Promise<{ message: string; profile: CustomerProfileData }> =>
      request("/customers/my-profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateDiscount: (
      id: number | string,
      data: { discount_type: "None" | "Senior Citizen" | "PWD"; discount_id_no?: string | null }
    ): Promise<{ message: string; discount_type: string; discount_id_no: string | null }> =>
      request(`/customers/${id}/discount`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    register: (data: {
      last_name: string;
      first_name: string;
      middle_name?: string;
      address: string;
      date_of_birth: string;
      civil_status: string;
      gender: string;
      phone: string;
      discount_type?: "None" | "Senior Citizen" | "PWD";
      discount_id_no?: string | null;
    }): Promise<{ message: string; customer_id: number }> =>
      request("/customers/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    approve: (id: number | string, username: string, password: string): Promise<{ message: string }> =>
      request(`/customers/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    deny: (id: number | string): Promise<{ message: string }> =>
      request(`/customers/${id}/deny`, {
        method: "POST",
      }),
    resetPassword: (id: number | string, newPassword: string): Promise<{ message: string; temp_password: string; customer_id: number; username: string }> =>
      request(`/customers/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),
  },

  // Staff
  staff: {
    getAll: (): Promise<StaffItem[]> => request<StaffItem[]>("/staff"),
    getMyProfile: (): Promise<StaffProfileData> => request<StaffProfileData>("/staff/my-profile"),
    updateMyProfile: (data: { full_name: string; username: string }): Promise<{ message: string; profile: StaffProfileData }> =>
      request("/staff/my-profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    create: (data: { username: string; password: string; full_name: string; role?: string }): Promise<StaffItem> =>
      request("/staff", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    toggleStatus: (id: number | string): Promise<{ status: "Active" | "Inactive" }> =>
      request(`/staff/${id}/toggle-status`, {
        method: "PATCH",
      }),
    resetPassword: (id: number | string, newPassword: string): Promise<{ message: string; temp_password?: string; new_password?: string; initial_temp_password?: string; staff_id: number; username: string }> =>
      request(`/staff/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),
  },

  // Transactions
  transactions: {
    getAll: (from?: string, to?: string): Promise<TransactionItem[]> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<TransactionItem[]>(`/transactions${query}`);
    },
    getMyHistory: (): Promise<TransactionItem[]> => request<TransactionItem[]>("/transactions/my-history"),
    getMyAnalytics: (): Promise<CustomerAnalyticsResponse> =>
      request<CustomerAnalyticsResponse>("/transactions/my-analytics"),
    getItems: (id: number | string) => request(`/transactions/${id}/items`),
    getCustomerTransactions: (customerId: number | string): Promise<TransactionItem[]> =>
      request<TransactionItem[]>(`/transactions/customer/${customerId}`),
    create: (data: {
      customer_id?: number | null;
      cashier_id: number;
      cash_tendered: number;
      items: Array<{ product_id: number; quantity: number }>;
      payment_method?: string;
      discount_type?: "None" | "Senior Citizen" | "PWD";
      discount_id_no?: string | null;
      discount_amount?: number;
      save_customer_discount?: boolean;
    }): Promise<TransactionItem> =>
      request("/transactions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Settings
  settings: {
    get: (): Promise<Record<string, string>> => request<Record<string, string>>("/settings"),
    update: (settings: Record<string, string>): Promise<{ message: string }> =>
      request("/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      }),
  },

  // Reports & Analytics
  reports: {
    getSummary: (from?: string, to?: string, prevFrom?: string, prevTo?: string): Promise<ReportsSummaryResponse> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (prevFrom) params.append("prevFrom", prevFrom);
      if (prevTo) params.append("prevTo", prevTo);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<ReportsSummaryResponse>(`/reports/summary${query}`);
    },

    getSalesOverview: (from?: string, to?: string, groupBy: "daily" | "weekly" | "monthly" | "yearly" = "daily"): Promise<SalesOverviewPoint[]> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (groupBy) params.append("groupBy", groupBy);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<SalesOverviewPoint[]>(`/reports/sales-overview${query}`);
    },

    getSalesByCategory: (from?: string, to?: string): Promise<CategorySalesReport> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<CategorySalesReport>(`/reports/sales-by-category${query}`);
    },

    getBestSellers: (from?: string, to?: string, sortBy: "quantity" | "revenue" = "quantity", limit = 20): Promise<BestSellerReportItem[]> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (sortBy) params.append("sortBy", sortBy);
      if (limit) params.append("limit", String(limit));
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<BestSellerReportItem[]>(`/reports/best-sellers${query}`);
    },

    getInventoryStatus: (): Promise<InventoryStatusReport> => {
      return request<InventoryStatusReport>("/reports/inventory-status");
    },

    getCustomerActivity: (from?: string, to?: string): Promise<CustomerActivityReport> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<CustomerActivityReport>(`/reports/customer-activity${query}`);
    },

    getStaffPerformance: (from?: string, to?: string): Promise<StaffPerformanceItem[]> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<StaffPerformanceItem[]>(`/reports/staff-performance${query}`);
    },

    getPaymentMethods: (from?: string, to?: string): Promise<PaymentMethodsReport> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<PaymentMethodsReport>(`/reports/payment-methods${query}`);
    },

    getTransactions: (filters?: { from?: string; to?: string; search?: string; payment_method?: string; staff_id?: number }): Promise<ReportTransactionItem[]> => {
      const params = new URLSearchParams();
      if (filters?.from) params.append("from", filters.from);
      if (filters?.to) params.append("to", filters.to);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.payment_method) params.append("payment_method", filters.payment_method);
      if (filters?.staff_id) params.append("staff_id", String(filters.staff_id));
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<ReportTransactionItem[]>(`/reports/transactions${query}`);
    },

    getReturnsAnalytics: (from?: string, to?: string): Promise<ReturnsAnalyticsReport> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request<ReturnsAnalyticsReport>(`/reports/returns-analytics${query}`);
    },
  },

  // Returns & Refunds (Staff/Admin only)
  returns: {
    getReturnableItems: (transactionId: number | string): Promise<ReturnableItemsResponse> =>
      request<ReturnableItemsResponse>(`/returns/transaction/${transactionId}/returnable-items`),

    getAll: (params?: { status?: string; from?: string; to?: string; search?: string }): Promise<ReturnsListResponse> => {
      const q = new URLSearchParams();
      if (params?.status) q.append("status", params.status);
      if (params?.from) q.append("from", params.from);
      if (params?.to) q.append("to", params.to);
      if (params?.search) q.append("search", params.search);
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return request<ReturnsListResponse>(`/returns${queryStr}`);
    },

    getById: (id: number | string): Promise<ProductReturn> =>
      request<ProductReturn>(`/returns/${id}`),

    getMyHistory: (): Promise<ProductReturn[]> =>
      request<ProductReturn[]>("/returns/my-history"),

    getCustomerReturns: (customerId: number | string): Promise<ProductReturn[]> =>
      request<ProductReturn[]>(`/returns/customer/${customerId}`),

    create: (data: CreateReturnPayload): Promise<{ message: string; return_id: number; return_no: string; refund_amount: number }> =>
      request("/returns", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateStatus: (
      id: number | string,
      data: { status: "Approved" | "Completed" | "Rejected"; admin_notes?: string; restock?: boolean }
    ): Promise<{ message: string; id: string | number; status: string }> =>
      request(`/returns/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Damaged Items & Staff Liability
  damages: {
    getAll: (params?: { staff_id?: number }): Promise<DamageIncident[]> => {
      const q = params?.staff_id ? `?staff_id=${params.staff_id}` : "";
      return request<DamageIncident[]>(`/damages${q}`);
    },
    getMyIncidents: (): Promise<DamageIncident[]> =>
      request<DamageIncident[]>("/damages/my-incidents"),
    create: (data: CreateDamagePayload): Promise<{ message: string; incident: DamageIncident; new_stock: number }> =>
      request("/damages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (
      id: number | string,
      data: { consequence_status: string; admin_notes?: string }
    ): Promise<{ message: string; incident: DamageIncident }> =>
      request(`/damages/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};

export type ReturnStatus = "Pending" | "Approved" | "Completed" | "Rejected" | "Cancelled";

export interface ReturnItemRecord {
  id?: number;
  return_id?: number;
  transaction_item_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  refund_amount: number | string;
  restock?: number | boolean;
  current_stock?: number;
}

export interface ProductReturn {
  id: number;
  return_no: string;
  transaction_id: number;
  receipt_no: string;
  customer_id: number;
  customer_name?: string;
  customer_code?: string;
  customer_phone?: string;
  cashier_name?: string;
  status: ReturnStatus;
  reason: string;
  customer_notes?: string | null;
  admin_notes?: string | null;
  refund_amount: number | string;
  replacement_product_id?: number | null;
  replacement_product_name?: string | null;
  replacement_quantity?: number;
  replacement_unit_price?: number | string;
  additional_amount_paid?: number | string;
  created_at: string;
  processed_at?: string | null;
  processed_by_username?: string | null;
  item_count?: number;
  total_items_quantity?: number;
  items?: ReturnItemRecord[];
}

export interface ReturnableItem {
  transaction_item_id: number;
  product_id: number;
  product_name: string;
  unit_price: number | string;
  purchased_quantity: number;
  subtotal: number | string;
  already_returned: number;
  available_quantity: number;
  is_returnable: boolean;
  return_ineligible_reason?: string | null;
  current_stock?: number;
}

export interface ReturnableItemsResponse {
  transaction: {
    id: number;
    receipt_no: string;
    customer_id: number;
    customer_name?: string;
    cashier_name?: string;
    total_amount: number | string;
    date: string;
    created_at?: string;
    elapsed_minutes?: number;
    elapsed_hours?: number;
    return_window_hours?: number;
    is_return_window_expired?: boolean;
    return_window_error?: string | null;
  };
  items: ReturnableItem[];
}

export interface ReturnsListResponse {
  returns: ProductReturn[];
  summary: {
    total_returns: number;
    pending_count: number;
    approved_count: number;
    completed_count: number;
    rejected_count: number;
    total_refunded: number | string;
  };
}

export interface CreateReturnPayload {
  transaction_id: number;
  reason: string;
  customer_notes?: string;
  status?: "Completed" | "Approved" | "Rejected" | "Pending";
  admin_notes?: string;
  restock?: boolean;
  replacement_item?: {
    product_id: number;
    product_name?: string;
    quantity: number;
    unit_price: number;
    additional_amount_paid?: number;
  };
  items: Array<{
    transaction_item_id: number;
    quantity: number;
  }>;
}

export interface ReportPeriodStats {
  total_sales: number;
  total_transactions: number;
  products_sold: number;
  customers_served: number;
  registered_customers_served: number;
}

export interface ReportsSummaryResponse {
  period: { from: string; to: string; prevFrom: string; prevTo: string };
  current: ReportPeriodStats;
  previous: ReportPeriodStats;
  growth: {
    sales_pct: number;
    transactions_pct: number;
    products_sold_pct: number;
    customers_served_pct: number;
  };
}

export interface SalesOverviewPoint {
  label: string;
  raw_date: string;
  total_sales: number;
  total_transactions: number;
}

export interface CategorySalesItem {
  category: string;
  items_sold: number;
  revenue: number;
  percentage: number;
}

export interface CategorySalesReport {
  total_revenue: number;
  categories: CategorySalesItem[];
}

export interface BestSellerReportItem {
  id: number;
  name: string;
  category: string;
  image_url?: string | null;
  price: number;
  stock: number;
  low_stock_threshold: number;
  quantity_sold: number;
  total_revenue: number;
}

export interface InventoryStatusItem {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface InventoryStatusReport {
  summary: {
    total_products: number;
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
  };
  products: InventoryStatusItem[];
}

export interface TopCustomerItem {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  transactions_count: number;
  items_purchased: number;
  total_spent: number;
  last_purchase_date: string;
}

export interface CustomerActivityReport {
  summary: {
    total_registered: number;
    purchased_in_period: number;
    returning_customers: number;
    new_customers: number;
  };
  top_customers: TopCustomerItem[];
}

export interface StaffPerformanceItem {
  id: number;
  staff_code: string;
  name: string;
  role: string;
  status: string;
  transactions_count: number;
  total_sales: number;
  avg_transaction_value: number;
  last_transaction: string;
}

export interface PaymentMethodItem {
  method: string;
  transactions_count: number;
  total_amount: number;
  percentage: number;
}

export interface PaymentMethodsReport {
  overall_total: number;
  methods: PaymentMethodItem[];
}

export interface ReportTransactionItem {
  id: number;
  receipt_no: string;
  customer: string;
  customer_code?: string | null;
  cashier: string;
  staff_code: string;
  items_count: number;
  total_amount: number;
  cash_tendered: number;
  change_amount: number;
  payment_method: string;
  status: string;
  date: string;
  raw_created_at: string;
}

export interface ReturnReasonStat {
  reason: string;
  count: number;
  refund_amount: number;
  items_count: number;
}

export interface TopReturnedProduct {
  product_id: number;
  product_name: string;
  category: string;
  return_occurrences: number;
  total_quantity_returned: number;
  total_refund_amount: number;
  total_restocked_quantity: number;
}

export interface ReportReturnItem {
  id: number;
  return_no: string;
  receipt_no: string;
  customer_name: string;
  customer_code: string;
  status: string;
  reason: string;
  customer_notes?: string | null;
  admin_notes?: string | null;
  refund_amount: number;
  date: string;
  items_count: number;
  total_items_quantity: number;
  returned_items_summary: string;
}

export interface ReturnsAnalyticsReport {
  summary: {
    total_returns: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    total_refunded: number;
    items_returned_count: number;
  };
  reasons: ReturnReasonStat[];
  top_returned_products: TopReturnedProduct[];
  returns_list: ReportReturnItem[];
}

/**
 * Dispatches a global event and broadcast channel message to notify all components
 * and tabs in real-time that inventory stock, transactions, or return data changed.
 */
export function notifyStockOrDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("smartmart:refresh-data"));
    window.dispatchEvent(new CustomEvent("smartmart:stock-updated"));
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel("smartmart_sync");
        channel.postMessage({ type: "STOCK_UPDATED", timestamp: Date.now() });
        channel.close();
      } catch {}
    }
  }
}
