import { supabase } from "@/integrations/supabase/client";

export interface OrderItemInput {
  product_handle: string;
  product_title: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  shipping_method: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  cod_fee: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface OrderItemRow extends OrderItemInput {
  id: string;
  order_id: string;
}

export const ORDER_STATUSES = [
  "placed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export function newOrderNumber() {
  return `SB${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** Creates an order (guest or signed-in) with its line items. */
export async function createOrder(input: {
  userId: string | null;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  shippingMethod: string;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  codFee: number;
  total: number;
  notes?: string | null;
  items: OrderItemInput[];
}): Promise<string> {
  const order_number = newOrderNumber();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_number,
      user_id: input.userId,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      shipping_method: input.shippingMethod,
      payment_method: input.paymentMethod,
      subtotal: input.subtotal,
      shipping_fee: input.shippingFee,
      cod_fee: input.codFee,
      total: input.total,
      notes: input.notes ?? null,
    })
    .select("id, order_number")
    .maybeSingle();

  if (error) throw error;

  const orderId = data?.id;
  if (orderId && input.items.length) {
    const { error: itemError } = await supabase.from("order_items").insert(
      input.items.map((i) => ({ ...i, order_id: orderId })),
    );
    if (itemError) throw itemError;
  }
  return order_number;
}

export async function fetchMyOrders(): Promise<(OrderRow & { items: OrderItemRow[] })[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o) => {
    const { order_items, ...rest } = o as OrderRow & { order_items: OrderItemRow[] };
    return { ...rest, items: order_items ?? [] };
  });
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ── contact messages ───────────────────────────────────────── */

export interface MessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string;
  handled: boolean;
  created_at: string;
}

export async function sendContactMessage(input: {
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}) {
  const { error } = await supabase.from("contact_messages").insert({
    user_id: input.userId,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    topic: input.topic,
    message: input.message,
  });
  if (error) throw error;
}

export async function fetchMessages(): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function markMessageHandled(id: string, handled: boolean) {
  const { error } = await supabase.from("contact_messages").update({ handled }).eq("id", id);
  if (error) throw error;
}

/* ── profile ────────────────────────────────────────────────── */

export interface ProfileRow {
  id: string;
  display_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export async function fetchMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone, address, city, state, pincode")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as ProfileRow | null;
}

export async function saveMyProfile(userId: string, patch: Partial<Omit<ProfileRow, "id">>) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (error) throw error;
}

export async function fetchCustomers(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone, address, city, state, pincode");
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}
