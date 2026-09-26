/** Admin data layer: product CRUD and editable page content (CMS blocks). */
import { supabase } from "@/integrations/supabase/client";
import {
  invalidateProductCache,
  type AdminProductRow,
  type ProductOption,
  type ProductVariantItem,
} from "@/lib/catalog";

export type { ProductOption, ProductVariantItem } from "@/lib/catalog";

export type ProductRow = AdminProductRow & {
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<AdminProductRow, "id">;

export const emptyProduct: ProductInput = {
  handle: "",
  title: "",
  description: "",
  product_type: "English Learning",
  tags: [],
  age_tag: "age-3-5",
  price: 0,
  compare_at_price: null,
  image_url: null,
  images: [],
  badge: null,
  sort_order: 0,
  active: true,
  options: [],
  variants: [],
};

export async function fetchAdminProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProductRow[];
}

export async function fetchAdminProduct(id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as (ProductRow & { stock: number; low_stock_threshold: number }) | null;
}

/** Uploads a cover photo to private storage and returns a long-lived link. */
export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signError || !data) throw signError ?? new Error("Could not create image link");
  return data.signedUrl;
}

export async function saveProductReturningId(input: ProductInput & { id?: string }) {
  const { id, ...payload } = input;
  if (id) {
    const { error } = await supabase.from("products").update(payload as any).eq("id", id);
    if (error) throw error;
    invalidateProductCache();
    return id;
  }
  const { data, error } = await supabase.from("products").insert(payload as any).select("id").single();
  if (error) throw error;
  invalidateProductCache();
  return data.id as string;
}

export async function saveProduct(input: ProductInput & { id?: string }) {
  const payload = { ...input };
  if (input.id) {
    const { error } = await supabase.from("products").update(payload as any).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("products").insert(payload as any);
    if (error) throw error;
  }
  invalidateProductCache();
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  invalidateProductCache();
}

export interface CmsBlockRow {
  id: string;
  block_key: string;
  page: string;
  heading: string;
  subheading: string | null;
  body: string | null;
  image_url: string | null;
  link_label: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
  metadata?: Record<string, any>;
  updated_at: string;
}

export async function fetchCmsBlocks(): Promise<CmsBlockRow[]> {
  const { data, error } = await supabase
    .from("cms_blocks")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CmsBlockRow[];
}

export async function updateCmsBlock(
  id: string,
  fields: Partial<Omit<CmsBlockRow, "id" | "updated_at">>,
) {
  const { error } = await supabase.from("cms_blocks").update(fields).eq("id", id);
  if (error) throw error;
}
