export type Role = 'admin' | 'sales' | 'supervisor' | 'admin_company' | 'rtm_staff'

export interface User {
  id: number
  name: string
  email: string
  phone: string
  role: Role
  is_super_admin: boolean 
  is_active: boolean
  CreatedAt: string
}

export interface Store {
  ID: number
  name: string
  code: string
  address: string
  city: string
  phone: string
  latitude: number
  longitude: number
  is_active: boolean
}

export interface Product {
  ID: number
  name: string
  sku: string
  barcode: string
  category: string
  unit: string
  price: number
  is_active: boolean
}

export interface Schedule {
  ID: number
  CreatedAt: string
  sales_id: number
  sales: User
  store_id: number
  store: Store
  visit_date: string
  notes: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
  visit?: Visit
}

export interface RecurringSchedule {
  ID: number
  sales_id: number
  sales: User
  store_id: number
  store: Store
  day_of_week: number // 0=Sun..6=Sat
  notes: string
  is_active: boolean
}

export interface Visit {
  ID: number
  CreatedAt: string
  schedule_id: number
  schedule?: Schedule
  sales_id: number
  sales: User
  store_id: number
  store: Store
  check_in_at: string | null
  check_in_lat: number
  check_in_lng: number
  check_in_photo_url: string
  check_out_at: string | null
  check_out_lat: number
  check_out_lng: number
  status: 'pending' | 'checked_in' | 'completed'
  notes: string
  stock_counts: StockCount[]
}

export interface StockCount {
  ID: number
  visit_id: number
  product_id: number
  product: Product
  qty: number
  notes: string
}

export interface DashboardSummary {
  today_schedules: number
  today_completed: number
  today_pending: number
  total_sales: number
  total_stores: number
  total_products: number
  recent_visits: Visit[]
  sales_performance: SalesPerf[]
}

export interface SalesPerf {
  sales_id: number
  sales_name: string
  total: number
  completed: number
}

export interface DwellPoint {
  lat: number
  lng: number
  arrived_at: string
  left_at: string
  duration_minutes: number
}

export interface DwellResponse {
  user_id: string
  date: string
  dwell_points: DwellPoint[]
  total_stops: number
  total_moving_minutes: number
  total_idle_minutes: number
}