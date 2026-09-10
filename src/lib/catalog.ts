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
  badge: string | null;
  sort_order: number;
  active: boolean;
}

export function adminRowToProduct(row: AdminProductRow): ShopifyProduct {
  const tags = [...new Set([...(row.tags ?? []), ...(row.age_tag ? [row.age_tag] : [])])];
  return {
    node: {
      id: `db:${row.id}`,
      title: row.title,
      description: row.description ?? "",
      handle: row.handle,
      productType: row.product_type || "Books",
      tags,
      priceRange: { minVariantPrice: { amount: String(row.price), currencyCode: "INR" } },
      compareAtPriceRange: row.compare_at_price
        ? { minVariantPrice: { amount: String(row.compare_at_price), currencyCode: "INR" } }
        : undefined,
      images: {
        edges: row.image_url ? [{ node: { url: row.image_url, altText: row.title } }] : [],
      },
      variants: {
        edges: [
          {
            node: {
              id: `db:${row.id}:default`,
              title: "Paperback",
              price: { amount: String(row.price), currencyCode: "INR" },
              compareAtPrice: row.compare_at_price
                ? { amount: String(row.compare_at_price), currencyCode: "INR" }
                : null,
              availableForSale: true,
              selectedOptions: [{ name: "Format", value: "Paperback" }],
            },
          },
        ],
      },
      options: [{ name: "Format", values: ["Paperback"] }],
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

/** Supports the small query dialect used across the app: `tag:x`, `product_type:x`, free text. */
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

function dedupe(list: ShopifyProduct[]) {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.node.handle)) return false;
    seen.add(p.node.handle);
    return true;
  });
}

export async function fetchProducts(first = 40, query?: string): Promise<ShopifyProduct[]> {
  const all = dedupe([...(await dbProducts()), ...BUNDLE_PRODUCTS, ...CATALOG]);
  const list = query ? all.filter((p) => matchesQuery(p, query)) : all;
  return list.slice(0, first);
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const all = dedupe([...(await dbProducts()), ...BUNDLE_PRODUCTS, ...CATALOG]);
  return all.find((p) => p.node.handle === handle) ?? null;
}

/** Synchronous list (static snapshot + bundles) for instant, non-async surfaces. */
export function allProducts() {
  return dedupe([...BUNDLE_PRODUCTS, ...CATALOG]);
}
