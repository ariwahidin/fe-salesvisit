const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

function token() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = token()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...opts.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    req<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => req<any>('/api/auth/me'),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: { role?: string; active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.role) q.set('role', params.role)
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[] }>(`/api/users?${q}`)
  },
  create: (data: any) => req<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => req<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => req<any>(`/api/users/${id}`, { method: 'DELETE' }),
}

// ─── Stores ───────────────────────────────────────────────────────────────────
export const storesApi = {
  list: (params?: { search?: string; active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[] }>(`/api/stores?${q}`)
  },
  get: (id: number) => req<any>(`/api/stores/${id}`),
  create: (data: any) => req<any>('/api/stores', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => req<any>(`/api/stores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => req<any>(`/api/stores/${id}`, { method: 'DELETE' }),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: { search?: string; category?: string; active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.category) q.set('category', params.category)
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[] }>(`/api/products?${q}`)
  },
  categories: () => req<{ data: string[] }>('/api/products/categories'),
  create: (data: any) => req<any>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => req<any>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => req<any>(`/api/products/${id}`, { method: 'DELETE' }),
}

// ─── Schedules ────────────────────────────────────────────────────────────────
export const schedulesApi = {
  // admin
  list: (params?: { date?: string; sales_id?: string; today?: boolean; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.date) q.set('date', params.date)
    if (params?.sales_id) q.set('sales_id', params.sales_id)
    if (params?.today) q.set('today', 'true')
    if (params?.status) q.set('status', params.status)
    return req<{ data: any[] }>(`/api/schedules?${q}`)
  },
  get: (id: number) => req<any>(`/api/schedules/${id}`),
  create: (data: any) => req<any>('/api/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => req<any>(`/api/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => req<any>(`/api/schedules/${id}`, { method: 'DELETE' }),
  // sales
  my: (date?: string) => {
    const q = new URLSearchParams()
    if (date) q.set('date', date)
    return req<{ data: any[]; date: string }>(`/api/schedules/my?${q}`)
  },
}

// ─── Recurring ────────────────────────────────────────────────────────────────
export const recurringApi = {
  list: (params?: { sales_id?: string; active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.sales_id) q.set('sales_id', params.sales_id)
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[] }>(`/api/recurring-schedules?${q}`)
  },
  create: (data: any) => req<any>('/api/recurring-schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => req<any>(`/api/recurring-schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => req<any>(`/api/recurring-schedules/${id}`, { method: 'DELETE' }),
  generate: (start_date: string, end_date: string) =>
    req<{ message: string; created: number; skipped: number; schedules: any[] }>(
      '/api/recurring-schedules/generate',
      { method: 'POST', body: JSON.stringify({ start_date, end_date }) }
    ),
}

// ─── Visits ───────────────────────────────────────────────────────────────────
export const visitsApi = {
  list: (params?: { sales_id?: string; store_id?: string; date?: string; today?: boolean; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.sales_id) q.set('sales_id', params.sales_id)
    if (params?.store_id) q.set('store_id', params.store_id)
    if (params?.date) q.set('date', params.date)
    if (params?.today) q.set('today', 'true')
    if (params?.status) q.set('status', params.status)
    return req<{ data: any[] }>(`/api/visits?${q}`)
  },
  get: (id: number) => req<any>(`/api/visits/${id}`),
  my: (date?: string) => {
    const q = new URLSearchParams()
    if (date) q.set('date', date)
    return req<{ data: any[] }>(`/api/visits/my?${q}`)
  },
  // multipart: FormData with latitude, longitude, photo
  checkIn: (scheduleId: number, form: FormData) =>
    req<any>(`/api/visits/check-in/${scheduleId}`, { method: 'POST', body: form }),
  checkOut: (visitId: number, data: any) =>
    req<any>(`/api/visits/check-out/${visitId}`, { method: 'POST', body: JSON.stringify(data) }),
  saveDraft: (visitId: number, data: { notes: string; stock_counts: any[] }) =>
    req<any>(`/api/visits/draft/${visitId}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => req<any>('/api/dashboard/summary'),
  stockReport: (params?: { store_id?: string; product_id?: string; sales_id?: string; start_date?: string; end_date?: string; today?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.store_id) q.set('store_id', params.store_id)
    if (params?.product_id) q.set('product_id', params.product_id)
    if (params?.sales_id) q.set('sales_id', params.sales_id)
    if (params?.start_date) q.set('start_date', params.start_date)
    if (params?.end_date) q.set('end_date', params.end_date)
    if (params?.today) q.set('today', 'true')
    return req<{ data: any[] }>(`/api/dashboard/stock-report?${q}`)
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const API_URL = API

export function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function formatDateTime(s: string) {
  return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
