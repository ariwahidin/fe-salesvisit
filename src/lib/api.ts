const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

function token() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
// export async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {

//   const t = token()
//   const res = await fetch(`${API}${path}`, {
//     ...opts,
//     headers: {
//       ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
//       ...(t ? { Authorization: `Bearer ${t}` } : {}),
//       ...opts.headers,
//     },
//   })
//   const data = await res.json()
//   if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
//   return data as T
// }

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
  list: (params?: {
    sales_id?: string; store_id?: string; date?: string; today?: boolean; status?: string; supervisor_id?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.sales_id) q.set('sales_id', params.sales_id)
    if (params?.store_id) q.set('store_id', params.store_id)
    if (params?.date) q.set('date', params.date)
    if (params?.today) q.set('today', 'true')
    if (params?.status) q.set('status', params.status)
    if (params?.supervisor_id) q.set('supervisor_id', params.supervisor_id)
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
  // checkOut: (visitId: number, data: any) =>
  //   req<any>(`/api/visits/check-out/${visitId}`, { method: 'POST', body: JSON.stringify(data) }),

  checkOut: (visitId: number, data: {
    latitude: number
    longitude: number
    notes: string
    stock_counts: { product_id: number; qty: number; notes: string }[]
    orders?: {           // opsional
      notes: string
      items: { product_id: number; qty: number }[]
    }[]
  }) =>
    req<any>(`/api/visits/check-out/${visitId}`, { method: 'POST', body: JSON.stringify(data) }),
  saveDraft: (visitId: number, data: { notes: string; stock_counts: any[] }) =>
    req<any>(`/api/visits/draft/${visitId}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ─── Supervisor Team ──────────────────────────────────────────────────────────
export const supervisorApi = {
  // Admin: kelola tim supervisor
  getSupervisors: () => req<{ data: any[] }>('/api/admin/supervisors'),
  getTeam: (supervisorId: number) =>
    req<{ data: any[] }>(`/api/admin/supervisors/${supervisorId}/team`),
  setTeam: (supervisorId: number, sales_ids: number[]) =>
    req<any>(`/api/admin/supervisors/${supervisorId}/team`, {
      method: 'PUT', body: JSON.stringify({ sales_ids }),
    }),
  // Supervisor: lihat tim sendiri
  myTeam: () => req<{ data: any[] }>('/api/supervisor/team'),
  // Supervisor: list & edit users di tim sendiri
  myTeamUsers: (params?: { active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[] }>(`/api/supervisor/users?${q}`)
  },
  updateTeamUser: (id: number, data: any) =>
    req<any>(`/api/supervisor/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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

// ─── Companies (super_admin) ──────────────────────────────────────────────────
export const companiesApi = {
  list: (params?: { search?: string; active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[]; total: number }>(`/api/super/companies?${q}`)
  },
  get: (id: number) => req<any>(`/api/super/companies/${id}`),
  create: (data: { name: string; code: string; address?: string; phone?: string; email?: string }) =>
    req<any>('/api/super/companies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; code: string; address: string; phone: string; email: string }>) =>
    req<any>(`/api/super/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) =>
    req<any>(`/api/super/companies/${id}`, { method: 'DELETE' }),
}

// ─── Regions (company_admin) ──────────────────────────────────────────────────
export const regionsApi = {
  list: (params?: { search?: string; active_only?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.active_only) q.set('active_only', 'true')
    return req<{ data: any[]; total: number }>(`/api/regions?${q}`)
  },
  get: (id: number) => req<any>(`/api/regions/${id}`),
  create: (data: { name: string; code: string; is_active?: boolean }) =>
    req<any>('/api/regions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; code: string; is_active: boolean }>) =>
    req<any>(`/api/regions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) =>
    req<any>(`/api/regions/${id}`, { method: 'DELETE' }),
}

// ─── Areas (company_admin) ────────────────────────────────────────────────────
export const areasApi = {
  list: (params?: { search?: string; active_only?: boolean; region_id?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.active_only) q.set('active_only', 'true')
    if (params?.region_id) q.set('region_id', String(params.region_id))
    return req<{ data: any[]; total: number }>(`/api/areas?${q}`)
  },
  get: (id: number) => req<any>(`/api/areas/${id}`),
  create: (data: { name: string; code: string; region_id: number; is_active?: boolean }) =>
    req<any>('/api/areas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; code: string; region_id: number; is_active: boolean }>) =>
    req<any>(`/api/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) =>
    req<any>(`/api/areas/${id}`, { method: 'DELETE' }),
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

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersApi = {
  // Admin
  list: (params?: { sales_id?: string; store_id?: string; visit_id?: string; status?: string; date?: string; supervisor_id?: string }) => {
    const q = new URLSearchParams()
    if (params?.sales_id) q.set('sales_id', params.sales_id)
    if (params?.store_id) q.set('store_id', params.store_id)
    if (params?.visit_id) q.set('visit_id', params.visit_id)
    if (params?.status) q.set('status', params.status)
    if (params?.date) q.set('date', params.date)
    if (params?.supervisor_id) q.set('supervisor_id', params.supervisor_id)
    return req<{ data: any[]; total: number }>(`/api/orders?${q}`)
  },
  get: (id: number) => req<any>(`/api/my/orders/${id}`),
  approve: (id: number) =>
    req<any>(`/api/orders/${id}/approve`, { method: 'PATCH' }),
  reject: (id: number, rejection_reason: string) =>
    req<any>(`/api/orders/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejection_reason }),
    }),
  pdfUrl: (id: number) => `${API}/api/my/orders/${id}/pdf`,

  // Sales
  my: (params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.date) q.set('date', params.date)
    return req<{ data: any[]; total: number }>(`/api/my/orders?${q}`)
  },
  getAdmin: (id: number) => req<any>(`/api/orders/${id}`),
  byVisit: (visitId: number) =>
    req<{ data: any[]; total: number }>(`/api/visits/${visitId}/orders`),
}

// Custom error classes
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Access denied') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
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

  if (!res.ok) {
    if (res.status === 401) {
      // Token expired / not logged in
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      throw new HttpError(401, 'Unauthorized')
    }

    if (res.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/access-denied'
        return {} as T
      }
      throw new ForbiddenError(data.error || 'Forbidden')
    }

    if (res.status === 403) {
      throw new ForbiddenError(data.error || 'You do not have permission to access this resource')
    }

    throw new HttpError(res.status, data.error || `HTTP ${res.status}`)
  }

  return data as T
}
