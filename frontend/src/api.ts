const API_BASE = "http://localhost:4000/api";

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
  total_amount: number | string;
  cash_tendered: number | string;
  change_amount: number | string;
  date: string;
}

export interface BestSellerItem {
  id: number;
  name: string;
  price: number | string;
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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const resData = await response.json();

  if (!response.ok) {
    throw new Error(resData.error || "An error occurred with the API request");
  }

  return resData as T;
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
    create: (data: { name: string; category_id: number; price: number; stock: number }): Promise<ProductItem> =>
      request("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStock: (id: number, stock: number): Promise<{ message: string }> =>
      request(`/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stock }),
      }),
    update: (id: number, data: { name: string; category_id: number; price: number; stock: number; image_url?: string | null }): Promise<{ message: string }> =>
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
    }): Promise<{ message: string; profile: CustomerProfileData }> =>
      request("/customers/my-profile", {
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
  },

  // Staff
  staff: {
    getAll: (): Promise<StaffItem[]> => request<StaffItem[]>("/staff"),
    create: (data: { username: string; password: string; full_name: string; role?: string }): Promise<StaffItem> =>
      request("/staff", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    toggleStatus: (id: number | string): Promise<{ status: "Active" | "Inactive" }> =>
      request(`/staff/${id}/toggle-status`, {
        method: "PATCH",
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
    getItems: (id: number | string) => request(`/transactions/${id}/items`),
    create: (data: {
      customer_id?: number | null;
      cashier_id: number;
      cash_tendered: number;
      items: Array<{ product_id: number; quantity: number }>;
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
  },
};

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
