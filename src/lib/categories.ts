import { supabase } from "@/integrations/supabase/client";

export interface CategoryRow {
  id: string; // URL slug, e.g. 'english-learning'
  name: string;
  description: string | null;
  image_url: string | null;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CategoryInput = Omit<CategoryRow, "created_at" | "updated_at">;

export const emptyCategory: CategoryInput = {
  id: "",
  name: "",
  description: "",
  image_url: null,
  featured: false,
  sort_order: 0,
};

export function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CategoryRow[];
}

export async function fetchCategory(id: string): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as CategoryRow | null;
}

export async function saveCategory(input: CategoryInput): Promise<string> {
  const id = input.id.trim() || slugifyCategory(input.name);
  const payload = {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    image_url: input.image_url || null,
    featured: input.featured,
    sort_order: Number(input.sort_order) || 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("categories")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
  return id;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Uploads a category photo to storage with a long-lived link */
export async function uploadCategoryImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `categories/${crypto.randomUUID()}.${ext}`;
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
