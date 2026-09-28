/**
 * Custom (non-Shopify) catalogue layer.
 *
 * Products come from:
 * 1. Staff-created products in Supabase
 * 2. Static bundle products
 * 3. Static catalogue products
 *
 * Shopify remains the source of shared product types/helpers only.
 */

import { CATALOG } from "@/lib/catalog-data";
import { BUNDLE_PRODUCTS } from "@/lib/bundles";
import { supabase } from "@/integrations/supabase/client";
import type { ShopifyProduct } from "@/lib/shopify";

export type { ShopifyProduct } from "@/lib/shopify";
export { formatINR, AGE_GROUPS, CATEGORIES, productRating } from "@/lib/shopify";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariantItem {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  stock?: number;
  available_for_sale?: boolean;
  selected_options?: Array<{
    name: string;
    value: string;
  }>;
  image_url?: string | null;
  images?: string[];
}

export interface AdminProductRow {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  product_type: string | null;
  tags: string[] | null;
  age_tag: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  images?: string[] | null;
  badge: string | null;
  sort_order: number;
  active: boolean;
  options?: ProductOption[] | null;
  variants?: ProductVariantItem[] | null;
  gift_wrap_price?: number | null;
  video_url?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function currencyAmount(value: unknown): string {
  return String(safeNumber(value, 0));
}

function normaliseImages(images?: string[] | null, fallback?: string | null): string[] {
  const result = [...(images ?? []), ...(fallback ? [fallback] : [])]
    .filter((image): image is string => typeof image === "string")
    .map((image) => image.trim())
    .filter(Boolean);

  return uniqueStrings(result);
}

/* -------------------------------------------------------------------------- */
/* Supabase row -> Shopify-compatible product                                 */
/* -------------------------------------------------------------------------- */

export function adminRowToProduct(row: AdminProductRow): ShopifyProduct {
  const tags = uniqueStrings([...cleanStringArray(row.tags), cleanString(row.age_tag)]);

  const gallery = normaliseImages(row.images, row.image_url);

  const variants = Array.isArray(row.variants) ? row.variants.filter(Boolean) : [];

  const hasCustomVariants = variants.length > 0;

  /*
   * Build variants as a plain intermediate structure first.
   *
   * This keeps the code predictable and avoids TypeScript inferring
   * incompatible union types between the custom/default branches.
   */
  const variantEdges = hasCustomVariants
    ? variants.map((variant, index) => {
        const variantImages = normaliseImages(variant.images, variant.image_url);

        const primaryImage = variantImages.length > 0 ? variantImages[0] : null;

        const selectedOptions =
          Array.isArray(variant.selected_options) && variant.selected_options.length > 0
            ? variant.selected_options
            : [
                {
                  name: "Option",
                  value: cleanString(variant.title) || `Option ${index + 1}`,
                },
              ];

        return {
          node: {
            id: cleanString(variant.id) || `db:${row.id}:variant-${index}`,

            title: cleanString(variant.title) || `Variant ${index + 1}`,

            price: {
              amount: currencyAmount(variant.price),
              currencyCode: "INR",
            },

            compareAtPrice:
              variant.compare_at_price !== null && variant.compare_at_price !== undefined
                ? {
                    amount: currencyAmount(variant.compare_at_price),
                    currencyCode: "INR",
                  }
                : null,

            availableForSale:
              typeof variant.available_for_sale === "boolean"
                ? variant.available_for_sale
                : variant.stock !== undefined
                  ? safeNumber(variant.stock) > 0
                  : true,

            selectedOptions,

            ...(primaryImage
              ? {
                  image: {
                    url: primaryImage,
                    altText: cleanString(variant.title) || cleanString(row.title),
                  },
                }
              : {}),

            images: variantImages,
          },
        };
      })
    : [
        {
          node: {
            id: `db:${row.id}:default`,
            title: "Default",

            price: {
              amount: currencyAmount(row.price),
              currencyCode: "INR",
            },

            compareAtPrice:
              row.compare_at_price !== null && row.compare_at_price !== undefined
                ? {
                    amount: currencyAmount(row.compare_at_price),
                    currencyCode: "INR",
                  }
                : null,

            availableForSale: true,

            selectedOptions: [
              {
                name: "Format",
                value: "Default",
              },
            ],

            images: [],
          },
        },
      ];

  const prices = variantEdges.map((edge) => safeNumber(edge.node.price.amount, safeNumber(row.price, 0)));

  const minPrice = prices.length > 0 ? Math.min(...prices) : safeNumber(row.price, 0);

  const options: ProductOption[] =
    Array.isArray(row.options) && row.options.length > 0
      ? row.options
          .filter(
            (option): option is ProductOption =>
              Boolean(option) && typeof option.name === "string" && Array.isArray(option.values),
          )
          .map((option) => ({
            name: cleanString(option.name),
            values: cleanStringArray(option.values),
          }))
          .filter((option) => option.name.length > 0 && option.values.length > 0)
      : hasCustomVariants
        ? [
            {
              name: "Option",
              values: variants.map((variant, index) => cleanString(variant.title) || `Variant ${index + 1}`),
            },
          ]
        : [
            {
              name: "Format",
              values: ["Default"],
            },
          ];

  const title = cleanString(row.title) || "Untitled Product";

  const product = {
    node: {
      id: `db:${row.id}`,
      title,
      description: cleanString(row.description),
      handle: cleanString(row.handle),
      productType: cleanString(row.product_type) || "Books",
      tags,

      priceRange: {
        minVariantPrice: {
          amount: String(minPrice),
          currencyCode: "INR",
        },
      },

      ...(row.compare_at_price !== null && row.compare_at_price !== undefined
        ? {
            compareAtPriceRange: {
              minVariantPrice: {
                amount: currencyAmount(row.compare_at_price),
                currencyCode: "INR",
              },
            },
          }
        : {}),

      images: {
        edges: gallery.map((url) => ({
          node: {
            url,
            altText: title,
          },
        })),
      },

      variants: {
        edges: variantEdges,
      },

      options,

      /*
       * These are custom fields used by the custom catalogue layer.
       */
      gift_wrap_price: safeNumber(row.gift_wrap_price, 0),

      video_url: typeof row.video_url === "string" && row.video_url.trim().length > 0 ? row.video_url.trim() : null,
    },
  };

  /*
   * The custom catalogue adds fields that may not exist in the original
   * Shopify type. Cast only at this boundary rather than spreading
   * `any` throughout the application.
   */
  return product as unknown as ShopifyProduct;
}

/* -------------------------------------------------------------------------- */
/* Database products                                                          */
/* -------------------------------------------------------------------------- */

let dbCache: {
  at: number;
  list: ShopifyProduct[];
} | null = null;

const DB_CACHE_TIME = 10 * 60 * 1000;

async function dbProducts(): Promise<ShopifyProduct[]> {
  if (dbCache && Date.now() - dbCache.at < DB_CACHE_TIME) {
    return dbCache.list;
  }

  try {
    const { data, error } = await supabase.from("products").select("*").eq("active", true).order("sort_order", {
      ascending: true,
    });

    if (error) {
      throw error;
    }

    const list: ShopifyProduct[] = (data ?? []).map((row) => adminRowToProduct(row as unknown as AdminProductRow));

    dbCache = {
      at: Date.now(),
      list,
    };

    return list;
  } catch (error) {
    /*
     * Do not break the storefront when the database is temporarily
     * unavailable. Return the previous cache if one exists.
     */
    console.error("[catalogue] Failed to load database products:", error);

    return dbCache?.list ?? [];
  }
}

export function invalidateProductCache(): void {
  dbCache = null;
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Supported query syntax:
 *
 *   tag:children
 *   product_type:Books
 *   title:colouring
 *   colouring book
 *
 * Multiple terms are treated as AND conditions.
 */
function matchesQuery(product: ShopifyProduct, query: string): boolean {
  const node = product.node;

  const parts = query.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return true;
  }

  return parts.every((part) => {
    const separatorIndex = part.indexOf(":");

    /*
     * No `:` means free-text search.
     */
    if (separatorIndex === -1) {
      const text = [node.title, node.description, ...(node.tags ?? [])].join(" ").toLowerCase();

      return text.includes(part.toLowerCase());
    }

    const rawKey = part.slice(0, separatorIndex).toLowerCase();

    const rawValue = part
      .slice(separatorIndex + 1)
      .replace(/^"|"$/g, "")
      .trim()
      .toLowerCase();

    if (!rawValue) {
      return true;
    }

    switch (rawKey) {
      case "tag":
        return (node.tags ?? []).some((tag) => tag.toLowerCase() === rawValue);

      case "product_type":
        return node.productType?.toLowerCase() === rawValue;

      case "title":
        return node.title.toLowerCase().includes(rawValue);

      default:
        /*
         * Unknown filters should not accidentally hide products.
         */
        return true;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Static catalogue                                                           */
/* -------------------------------------------------------------------------- */

export function allProducts(): ShopifyProduct[] {
  return [...BUNDLE_PRODUCTS, ...CATALOG];
}

/* -------------------------------------------------------------------------- */
/* Fetch products                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchProducts(
  first = 50,
  query?: string,
  sortKey?: string,
  reverse = false,
): Promise<ShopifyProduct[]> {
  const custom = await dbProducts();

  const all: ShopifyProduct[] = [...custom, ...BUNDLE_PRODUCTS, ...CATALOG];

  /*
   * Staff-created products take priority over static products
   * with the same handle.
   */
  const seen = new Set<string>();
  const deduped: ShopifyProduct[] = [];

  for (const product of all) {
    const handle = product.node.handle;

    if (!handle || seen.has(handle)) {
      continue;
    }

    seen.add(handle);
    deduped.push(product);
  }

  let filtered = query ? deduped.filter((product) => matchesQuery(product, query)) : deduped;

  if (sortKey === "PRICE") {
    filtered = [...filtered].sort((a, b) => {
      const priceA = safeNumber(a.node.priceRange?.minVariantPrice?.amount);

      const priceB = safeNumber(b.node.priceRange?.minVariantPrice?.amount);

      return reverse ? priceB - priceA : priceA - priceB;
    });
  }

  if (sortKey === "TITLE") {
    filtered = [...filtered].sort((a, b) => {
      const comparison = a.node.title.localeCompare(b.node.title);

      return reverse ? -comparison : comparison;
    });
  }

  const limit = Math.max(0, Math.floor(safeNumber(first, 50)));

  return filtered.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Fetch single product                                                       */
/* -------------------------------------------------------------------------- */

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const cleanHandle = cleanString(handle);

  if (!cleanHandle) {
    return null;
  }

  try {
    const { data, error } = await supabase.from("products").select("*").eq("handle", cleanHandle).maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return adminRowToProduct(data as unknown as AdminProductRow);
    }
  } catch (error) {
    console.error(`[catalogue] Failed to load product "${cleanHandle}":`, error);
  }

  const fromBundles = BUNDLE_PRODUCTS.find((product) => product.node.handle === cleanHandle);

  if (fromBundles) {
    return fromBundles;
  }

  return CATALOG.find((product) => product.node.handle === cleanHandle) ?? null;
}
