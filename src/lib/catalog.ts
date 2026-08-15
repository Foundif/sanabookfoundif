/**
 * Custom (non-Shopify) catalogue layer.
 * The app reads products from here instead of the Storefront API.
 * Shopify code is intentionally kept in src/lib/shopify.ts so it can be restored later.
 */
import { CATALOG } from "@/lib/catalog-data";
import type { ShopifyProduct } from "@/lib/shopify";

export type { ShopifyProduct } from "@/lib/shopify";
export { formatINR, AGE_GROUPS, CATEGORIES, productRating } from "@/lib/shopify";

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
    switch (rawKey.toLowerCase()) {
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

export async function fetchProducts(first = 40, query?: string): Promise<ShopifyProduct[]> {
  const list = query ? CATALOG.filter((p) => matchesQuery(p, query)) : CATALOG;
  return list.slice(0, first);
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  return CATALOG.find((p) => p.node.handle === handle) ?? null;
}

export function allProducts() {
  return CATALOG;
}
