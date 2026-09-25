/** Admin data layer: coupons, stock, orders overview and customer stats. */
import { supabase } from "@/integrations/supabase/client";
import { invalidateProductCache } from "@/lib/catalog";
import type { OrderItemRow, OrderRow } from "@/lib/orders";

/* ── coupons ────────────────────────────────────────────────── */

export interface CouponRow {
  id: string;
  code: string;
  description: string;
  discount_type: "percent" | "flat";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  times_used: number;
  free_shipping: boolean;
  active: boolean;
  created_at: string;
}

export type CouponInput = Omit<CouponRow, "id" | "times_used" | "created_at">;

export const emptyCoupon: CouponInput = {
  code: "",
  description: "",
  discount_type: "percent",
  value: 10,
  min_subtotal: 0,
  max_discount: null,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
  free_shipping: false,
  active: true,
};

export async function fetchCoupons(): Promise<CouponRow[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CouponRow[];
}

export async function saveCoupon(input: CouponInput & { id?: string }) {
  const payload = { ...input, code: input.code.trim().toUpperCase() };
  if (input.id) {
    const { id, ...rest } = payload as CouponInput & { id: string };
    const { error } = await supabase.from("coupons").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("coupons").insert(payload);
    if (error) throw error;
  }
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

export interface CouponCheck {
  ok: boolean;
  reason?: string;
  code?: string;
  discount?: number;
  free_shipping?: boolean;
  description?: string;
  min_subtotal?: number;
}

/** Validates a coupon code for a cart subtotal. Safe for guests. */
export async function checkCoupon(code: string, subtotal: number): Promise<CouponCheck> {
  const { data, error } = await supabase.rpc("check_coupon", {
    _code: code,
    _subtotal: subtotal,
  });
  if (error) return { ok: false, reason: "We could not check that code right now." };
  return (data ?? { ok: false, reason: "This code is not valid." }) as unknown as CouponCheck;
}

/* ── stock ──────────────────────────────────────────────────── */

export interface StockRow {
  id: string;
  handle: string;
  title: string;
  product_type: string;
  image_url: string | null;
  price: number;
  stock: number;
  low_stock_threshold: number;
  active: boolean;
}

export async function fetchStock(): Promise<StockRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, handle, title, product_type, image_url, price, stock, low_stock_threshold, active")
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as StockRow[];
}

export async function updateStock(id: string, stock: number, lowStockThreshold?: number) {
  const patch: { stock: number; low_stock_threshold?: number } = { stock };
  if (typeof lowStockThreshold === "number") patch.low_stock_threshold = lowStockThreshold;
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) throw error;
  invalidateProductCache();
}

/* ── orders ─────────────────────────────────────────────────── */

export type AdminOrder = OrderRow & {
  coupon_code: string | null;
  discount: number;
  items: OrderItemRow[];
};

export async function fetchAllOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o) => {
    const { order_items, ...rest } = o as unknown as AdminOrder & { order_items: OrderItemRow[] };
    return { ...rest, items: order_items ?? [] };
  });
}

export async function fetchOrderById(id: string): Promise<AdminOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { order_items, ...rest } = data as unknown as AdminOrder & { order_items: OrderItemRow[] };
  return { ...rest, items: order_items ?? [] };
}

/* ── customers ──────────────────────────────────────────────── */

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  childName: string | null;
  childAge: number | null;
  orders: number;
  spend: number;
  lastOrder: string | null;
  createdAt: string | null;
}

// in src/lib/admin.ts -> fetchCustomerSummaries
export async function fetchCustomerSummaries(): Promise<CustomerSummary[]> {
  const [profiles, orders, roles] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, phone, city, child_name, child_age, created_at"),
    supabase.from("orders").select("user_id, email, full_name, phone, city, total, created_at"),
    supabase.from("user_roles").select("user_id, role").in("role", ["admin", "staff"]),
  ]);
  if (profiles.error) throw profiles.error;
  if (orders.error) throw orders.error;

  const staffUserIds = new Set((roles.data ?? []).map((r) => r.user_id));

  const byId = new Map<string, CustomerSummary>();
  for (const p of profiles.data ?? []) {
    // Skip admins and staff accounts from the customer roster
    if (staffUserIds.has(p.id)) continue;

    byId.set(p.id, {
      id: p.id,
      name: p.display_name ?? "Shopper",
      email: "",
      phone: p.phone,
      city: p.city,
      childName: p.child_name,
      childAge: p.child_age,
      orders: 0,
      spend: 0,
      lastOrder: null,
      createdAt: p.created_at,
    });
  }

  for (const o of orders.data ?? []) {
    if (o.user_id && staffUserIds.has(o.user_id)) continue;
    const key = o.user_id ?? `guest:${o.email.toLowerCase()}`;
    const existing =
      byId.get(key) ??
      ({
        id: key,
        name: o.full_name,
        email: o.email,
        phone: o.phone,
        city: o.city,
        childName: null,
        childAge: null,
        orders: 0,
        spend: 0,
        lastOrder: null,
        createdAt: null,
      } as CustomerSummary);
    existing.orders += 1;
    existing.spend += Number(o.total ?? 0);
    if (!existing.email) existing.email = o.email;
    if (!existing.phone) existing.phone = o.phone;
    if (!existing.city) existing.city = o.city;
    if (!existing.lastOrder || o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
    byId.set(key, existing);
  }

  return [...byId.values()].sort((a, b) => b.spend - a.spend);
}

/* ── dashboard ──────────────────────────────────────────────── */

export interface DashboardStats {
  revenue: number;
  revenue30: number;
  orderCount: number;
  orders30: number;
  pending: number;
  averageOrder: number;
  customers: number;
  products: number;
  lowStock: number;
  openMessages: number;
  activeCoupons: number;
  recentOrders: AdminOrder[];
  recentCustomers: CustomerSummary[];
  statusBreakdown: { status: string; count: number }[];
}

export async function fetchDashboard(): Promise<DashboardStats> {
  const [orders, customers, stock, messages, coupons] = await Promise.all([
    fetchAllOrders(),
    fetchCustomerSummaries(),
    fetchStock(),
    supabase.from("contact_messages").select("id, handled"),
    fetchCoupons().catch(() => []),
  ]);

  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = orders.filter((o) => new Date(o.created_at).getTime() >= since);
  const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const statusMap = new Map<string, number>();
  for (const o of orders) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);

  return {
    revenue,
    revenue30: recent.reduce((s, o) => s + Number(o.total ?? 0), 0),
    orderCount: orders.length,
    orders30: recent.length,
    pending: orders.filter((o) => o.status === "placed" || o.status === "packed").length,
    averageOrder: orders.length ? revenue / orders.length : 0,
    customers: customers.length,
    products: stock.length,
    lowStock: stock.filter((s) => s.stock <= s.low_stock_threshold).length,
    openMessages: (messages.data ?? []).filter((m) => !m.handled).length,
    activeCoupons: coupons.filter((c) => c.active).length,
    recentOrders: orders.slice(0, 6),
    recentCustomers: [...customers]
      .sort((a, b) => (b.lastOrder ?? b.createdAt ?? "").localeCompare(a.lastOrder ?? a.createdAt ?? ""))
      .slice(0, 6),
    statusBreakdown: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
  };
}
