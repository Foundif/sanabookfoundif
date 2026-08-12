import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN =
  "sanabooks-india-expansion-3nhc0-r7jammgv.myshopify.com";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = "822bf4258efe2bd1fd7e4a75d311b319";

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    productType: string;
    tags: string[];
    priceRange: {
      minVariantPrice: { amount: string; currencyCode: string };
    };
    compareAtPriceRange?: {
      minVariantPrice: { amount: string; currencyCode: string };
    };
    images: {
      edges: Array<{ node: { url: string; altText: string | null } }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: { amount: string; currencyCode: string };
          compareAtPrice: { amount: string; currencyCode: string } | null;
          availableForSale: boolean;
          selectedOptions: Array<{ name: string; value: string }>;
        };
      }>;
    };
    options: Array<{ name: string; values: string[] }>;
    metafields?: Array<{ key: string; value: string } | null>;
  };
}

/** Aggregate rating from Shopify's verified customer reviews metafields. */
export function productRating(product: ShopifyProduct): { average: number; count: number } | null {
  const fields = product.node.metafields ?? [];
  const raw = fields.find((f) => f?.key === "rating")?.value;
  const countRaw = fields.find((f) => f?.key === "rating_count")?.value;
  if (!raw) return null;

  let average = NaN;
  try {
    const parsed = JSON.parse(raw) as { value?: string } | number;
    average = typeof parsed === "number" ? parsed : parseFloat(parsed.value ?? "");
  } catch {
    average = parseFloat(raw);
  }
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  if (!Number.isFinite(average) || average <= 0) return null;
  return { average, count: Number.isFinite(count) ? count : 0 };
}


const PRODUCT_FIELDS = `
  id
  title
  description
  handle
  productType
  tags
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } }
  images(first: 5) { edges { node { url altText } } }
  variants(first: 10) {
    edges {
      node {
        id
        title
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        availableForSale
        selectedOptions { name value }
      }
    }
  }
  options { name values }
  metafields(identifiers: [
    { namespace: "reviews", key: "rating" },
    { namespace: "reviews", key: "rating_count" }
  ]) { key value }
`;


export const STOREFRONT_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges { node { ${PRODUCT_FIELDS} } }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

export async function storefrontApiRequest(
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description:
        "Shopify API access requires an active Shopify billing plan. Visit https://admin.shopify.com to upgrade.",
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(
      `Error calling Shopify: ${data.errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }

  return data;
}

export async function fetchProducts(first = 40, query?: string) {
  const data = await storefrontApiRequest(STOREFRONT_QUERY, { first, query: query ?? null });
  return (data?.data?.products?.edges ?? []) as ShopifyProduct[];
}

export async function fetchProductByHandle(handle: string) {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? ({ node } as ShopifyProduct) : null;
}

export function formatINR(amount: string | number) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export const AGE_GROUPS = [
  { tag: "age-0-2", label: "0 – 2 years", note: "Board books & first words" },
  { tag: "age-3-5", label: "3 – 5 years", note: "Picture books & activities" },
  { tag: "age-6-8", label: "6 – 8 years", note: "Early readers & puzzles" },
  { tag: "age-9-12", label: "9 – 12 years", note: "Chapter books & discovery" },
  { tag: "adults", label: "Grown-ups", note: "A quiet shelf for you" },
] as const;

export const CATEGORIES = [
  "Picture Books",
  "Early Readers",
  "Chapter Books",
  "Activity Kits",
  "Bundles",
  "Adult Reads",
  "Hindi & Regional Library",
] as const;
