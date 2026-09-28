/** Admin data layer: product CRUD, in-browser auto-compression, and CMS blocks. */
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
  product_type: "Activity Books",
  tags: ["age-3-5"],
  age_tag: "age-3-5",
  price: 0,
  compare_at_price: null,
  image_url: null,
  images: [],
  badge: null,
  sort_order: 100,
  active: true,
  options: [{ name: "Format", values: ["Paperback"] }],
  variants: [],
  gift_wrap_price: 0,
  video_url: null,
};

/** In-browser photo compression: downscales large photos and compresses to JPEG ~150KB */
export async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function uploadVariantImage(file: File): Promise<string> {
  // Auto-compress variation photo down to 800px / ~80KB
  const compressed = await compressImage(file, 800, 0.8);
  const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `variants/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) throw error;
  const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return data?.signedUrl || "";
}

/** Uploads product video with a strict 10 MB limit */
export async function uploadProductVideo(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Video file exceeds the 10 MB limit. Please compress or link via YouTube/Vimeo.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `videos/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signError || !data) throw signError ?? new Error("Could not generate video link");
  return data.signedUrl;
}

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

/** Auto-compresses and uploads a product photo */
export async function uploadProductImage(file: File): Promise<string> {
  const optimized = await compressImage(file, 1200, 0.82);
  const ext = optimized.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, optimized, { contentType: optimized.type, upsert: false });
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
    const { error } = await supabase
      .from("products")
      .update(payload as any)
      .eq("id", id);
    if (error) throw error;
    invalidateProductCache();
    return id;
  }
  const { data, error } = await supabase
    .from("products")
    .insert(payload as any)
    .select("id")
    .single();
  if (error) throw error;
  invalidateProductCache();
  return data.id as string;
}

export async function saveProduct(input: ProductInput & { id?: string }) {
  const payload = { ...input };
  if (input.id) {
    const { error } = await supabase
      .from("products")
      .update(payload as any)
      .eq("id", input.id);
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
  const { data, error } = await supabase.from("cms_blocks").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CmsBlockRow[];
}

export async function updateCmsBlock(id: string, fields: Partial<Omit<CmsBlockRow, "id" | "updated_at">>) {
  const { error } = await supabase
    .from("cms_blocks")
    .update(fields as never)
    .eq("id", id);
  if (error) throw error;
}
export const saveCmsBlock = updateCmsBlock;
