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
    getLowStock: (): Promise<ProductItem[]> => request<ProductItem[]>("/products/low-stock"),
    create: (data: { name: string; category_id: number; price: number; stock: number }): Promise<ProductItem> =>
      request("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStock: (id: number, stock: number): Promise<{ message: string }> =>
      request(`/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stock }),
      }),
  },

  // Customers
  customers: {
    getRegistered: (): Promise<RegisteredCustomer[]> => request<RegisteredCustomer[]>("/customers"),
    getPending: (): Promise<PendingCustomer[]> => request<PendingCustomer[]>("/customers/pending"),
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
};
