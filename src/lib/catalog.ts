/**
 * Custom (non-Shopify) catalogue layer.
 * Products come from three places: the static snapshot, the bundle lineup,
 * and any products created by staff in the admin panel.
 * Shopify code is intentionally kept in src/lib/shopify.ts so it can be restored later.
 */
import { CATALOG } from "@/lib/catalog-data";
import { BUNDLE_PRODUCTS } from "@/lib/bundles";
import { supabase } from "@/integrations/supabase/client";
import type { ShopifyProduct } from "@/lib/shopify";

export type { ShopifyProduct } from "@/lib/shopify";
export { formatINR, AGE_GROUPS, CATEGORIES, productRating } from "@/lib/shopify";

export interface ProductOption {
  name: string; // e.g. "Pages", "Age Group", "Format"
  values: string[]; // e.g. ["32 Pages", "64 Pages"]
}

export interface ProductVariantItem {
  id: string;
  title: string; // e.g. "32 Pages" or "Hardcover • Age 3-5"
  price: number;
  compare_at_price: number | null;
  stock?: number;
  available_for_sale?: boolean;
  selected_options?: Array<{ name: string; value: string }>;
}

export interface AdminProductRow {
  id: string;
  handle: string;
  title: string;
  description: string;
  product_type: string;
  tags: string[];
  age_tag: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  images?: string[];
  badge: string | null;
  sort_order: number;
  active: boolean;
  options?: ProductOption[];
  variants?: ProductVariantItem[];
}

export function adminRowToProduct(row: AdminProductRow): ShopifyProduct {
  const tags = [...new Set([...(row.tags ?? []), ...(row.age_tag ? [row.age_tag] : [])])];
  const gallery = [
    ...new Set([...(row.image_url ? [row.image_url] : []), ...(row.images ?? [])]),
  ].filter(Boolean);

  const hasCustomVariants = Array.isArray(row.variants) && row.variants.length > 0;

  const variantEdges = hasCustomVariants
    ? row.variants!.map((v, idx) => ({
        node: {
          id: v.id || `db:${row.id}:v-${idx}`,
          title: v.title,
          price: { amount: String(v.price), currencyCode: "INR" },
          compareAtPrice: v.compare_at_price
            ? { amount: String(v.compare_at_price), currencyCode: "INR" }
            : null,
          availableForSale: v.available_for_sale ?? (v.stock !== undefined ? v.stock > 0 : true),
          selectedOptions: v.selected_options || [{ name: "Option", value: v.title }],
        },
      }))
    : [
        {
          node: {
            id: `db:${row.id}:default`,
            title: "Default",
            price: { amount: String(row.price), currencyCode: "INR" },
            compareAtPrice: row.compare_at_price
              ? { amount: String(row.compare_at_price), currencyCode: "INR" }
              : null,
            availableForSale: true,
            selectedOptions: [{ name: "Format", value: "Default" }],
          },
        },
      ];

  const prices = variantEdges.map((e) => parseFloat(e.node.price.amount) || row.price);
  const minPrice = Math.min(...prices);

  const options =
    Array.isArray(row.options) && row.options.length > 0
      ? row.options
      : hasCustomVariants
      ? [{ name: "Option", values: row.variants!.map((v) => v.title) }]
      : [{ name: "Format", values: ["Default"] }];

  return {
    node: {
      id: `db:${row.id}`,
      title: row.title,
      description: row.description ?? "",
      handle: row.handle,
      productType: row.product_type || "Books",
      tags,
      priceRange: { minVariantPrice: { amount: String(minPrice), currencyCode: "INR" } },
      ...(row.compare_at_price
        ? {
            compareAtPriceRange: {
              minVariantPrice: { amount: String(row.compare_at_price), currencyCode: "INR" },
            },
          }
        : {}),
      images: {
        edges: gallery.map((url) => ({ node: { url, altText: row.title } })),
      },
      variants: {
        edges: variantEdges,
      },
      options,
    },
  };
}

let dbCache: { at: number; list: ShopifyProduct[] } | null = null;

async function dbProducts(): Promise<ShopifyProduct[]> {
  if (dbCache && Date.now() - dbCache.at < 30_000) return dbCache.list;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const list = (data ?? []).map((row) => adminRowToProduct(row as unknown as AdminProductRow));
    dbCache = { at: Date.now(), list };
    return list;
  } catch {
    return dbCache?.list ?? [];
  }
}

export function invalidateProductCache() {
  dbCache = null;
}

/** Supports query dialect: `tag:x`, `product_type:x`, free text. */
function matchesQuery(product: ShopifyProduct, query: string) {
  const node = product.node;
  const parts = query.split(/\s+/).filter(Boolean);
  return parts.every((part) => {
    const [rawKey, ...rest] = part.split(":");
    const value = rest.join(":").replace(/^"|"$/g, "").toLowerCase();
    if (!value) {
      const text = `${node.title} ${node.description} ${node.tags.join(" ")}`.toLowerCase();
      return text.includes(part.toLowerCase());
    }
    switch ((rawKey ?? "").toLowerCase()) {
      case "tag":
        return node.tags.some((t) => t.toLowerCase() === value);
      case "product_type":
        return node.productType.toLowerCase() === value;
      case "title":
        return node.title.toLowerCase().includes(value);
      default:
        return true;
    }
  });
}

export async function fetchProducts(
  first = 50,
  query?: string,
  sortKey?: string,
  reverse = false,
): Promise<ShopifyProduct[]> {
  const custom = await dbProducts();
  const all: ShopifyProduct[] = [...custom, ...BUNDLE_PRODUCTS, ...CATALOG];
  const seen = new Set<string>();
  const deduped: ShopifyProduct[] = [];
  for (const p of all) {
    if (seen.has(p.node.handle)) continue;
    seen.add(p.node.handle);
    deduped.push(p);
  }

  let filtered = query ? deduped.filter((p) => matchesQuery(p, query)) : deduped;

  if (sortKey === "PRICE") {
    filtered.sort((a, b) => {
      const pa = parseFloat(a.node.priceRange.minVariantPrice.amount);
      const pb = parseFloat(b.node.priceRange.minVariantPrice.amount);
      return reverse ? pb - pa : pa - pb;
    });
  } else if (sortKey === "TITLE") {
    filtered.sort((a, b) =>
      reverse
        ? b.node.title.localeCompare(a.node.title)
        : a.node.title.localeCompare(b.node.title),
    );
  }

  return filtered.slice(0, first);
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  try {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("handle", handle)
      .maybeSingle();
    if (data) {
      return adminRowToProduct(data as unknown as AdminProductRow);
    }
  } catch {
    // fall through to static data
  }
  const fromBundles = BUNDLE_PRODUCTS.find((p) => p.node.handle === handle);
  if (fromBundles) return fromBundles;
  return CATALOG.find((p) => p.node.handle === handle) ?? null;
}
