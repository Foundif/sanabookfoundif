/** Admin data layer: product CRUD and editable page content (CMS blocks). */
import { supabase } from "@/integrations/supabase/client";
import { invalidateProductCache, type AdminProductRow } from "@/lib/catalog";

export type ProductRow = AdminProductRow & {
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<AdminProductRow, "id">;

export const emptyProduct: ProductInput = {
  handle: "",
  title: "",
  description: "",
  product_type: "Picture Books",
  tags: [],
  age_tag: "age-3-5",
  price: 0,
  compare_at_price: null,
  image_url: null,
  badge: null,
  sort_order: 0,
  active: true,
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

export async function saveProduct(input: ProductInput & { id?: string }) {
  const payload = { ...input };
  if (input.id) {
    const { error } = await supabase.from("products").update(payload).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("products").insert(payload);
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
}

export async function fetchCmsBlocks(page?: string): Promise<CmsBlockRow[]> {
  let q = supabase.from("cms_blocks").select("*").order("sort_order", { ascending: true });
  if (page) q = q.eq("page", page);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as CmsBlockRow[];
}

export async function saveCmsBlock(block: Partial<CmsBlockRow> & { block_key: string }) {
  if (block.id) {
    const { id, ...rest } = block;
    const { error } = await supabase.from("cms_blocks").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("cms_blocks").insert(block);
    if (error) throw error;
  }
}

export async function deleteCmsBlock(id: string) {
  const { error } = await supabase.from("cms_blocks").delete().eq("id", id);
  if (error) throw error;
}
