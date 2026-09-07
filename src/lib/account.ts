import { supabase } from "@/integrations/supabase/client";

/* ── addresses ──────────────────────────────────────────────── */

export interface AddressRow {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export type AddressInput = Omit<AddressRow, "id" | "user_id">;

export async function fetchAddresses(): Promise<AddressRow[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("id, user_id, label, full_name, phone, address, city, state, pincode, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AddressRow[];
}

export async function saveAddress(userId: string, input: AddressInput, id?: string) {
  if (input.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  }
  if (id) {
    const { error } = await supabase.from("addresses").update(input).eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("addresses").insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function deleteAddress(id: string) {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
}

/* ── wishlist ───────────────────────────────────────────────── */

export interface WishlistRow {
  id: string;
  product_handle: string;
  product_title: string | null;
  image_url: string | null;
}

export async function fetchWishlist(): Promise<WishlistRow[]> {
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("id, product_handle, product_title, image_url")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WishlistRow[];
}

export async function addToWishlist(
  userId: string,
  item: { product_handle: string; product_title: string | null; image_url: string | null },
) {
  const { error } = await supabase
    .from("wishlist_items")
    .upsert({ user_id: userId, ...item }, { onConflict: "user_id,product_handle" });
  if (error) throw error;
}

export async function removeFromWishlist(userId: string, handle: string) {
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_handle", handle);
  if (error) throw error;
}

/* ── extended profile (child + payment + communication) ─────── */

export interface AccountProfile {
  id: string;
  display_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  child_name: string | null;
  child_age: number | null;
  child_interests: string[];
  preferred_payment: string | null;
  upi_id: string | null;
  notify_picks: boolean;
  notify_launches: boolean;
  notify_orders: boolean;
  notify_digest: boolean;
}

const PROFILE_COLUMNS =
  "id, display_name, phone, address, city, state, pincode, child_name, child_age, child_interests, preferred_payment, upi_id, notify_picks, notify_launches, notify_orders, notify_digest";

export async function fetchAccountProfile(userId: string): Promise<AccountProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AccountProfile | null;
}

export async function saveAccountProfile(
  userId: string,
  patch: Partial<Omit<AccountProfile, "id">>,
) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (error) throw error;
}

export const INTEREST_OPTIONS = [
  "Animals",
  "Trains",
  "Stars",
  "Cooking",
  "Friendship",
  "Magic",
  "Sports",
  "Science",
] as const;
