/**
 * Promotions system: rotating homepage banners and featured collections.
 * Each entry is tied to real Shopify products via a Storefront search query.
 */

export interface PromoBanner {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** Shopify search query used for the linked shelf. */
  search: { category?: string; age?: string; q?: string };
  tone: "navy" | "primary" | "saffron" | "leaf";
  badge: string;
}

export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "bundles",
    eyebrow: "Curated bundles",
    title: "Save up to 25%, gift in one go",
    body: "Hand-picked sets that ship in a kraft gift box with a hand-written note — free.",
    ctaLabel: "Shop bundles",
    search: { category: "Bundles" },
    tone: "navy",
    badge: "Up to 25% off",
  },
  {
    id: "monsoon",
    eyebrow: "Monsoon reading",
    title: "Rainy-day picture books for small hands",
    body: "Sturdy board and picture books built for indoor afternoons and repeat readings.",
    ctaLabel: "Shop picture books",
    search: { category: "Picture Books" },
    tone: "primary",
    badge: "Free shipping over ₹499",
  },
  {
    id: "hindi",
    eyebrow: "Hindi & regional",
    title: "A growing shelf in your mother tongue",
    body: "Bilingual and Hindi titles chosen to sit comfortably beside English favourites.",
    ctaLabel: "Browse the shelf",
    search: { category: "Hindi & Regional Library" },
    tone: "saffron",
    badge: "New arrivals weekly",
  },
  {
    id: "schools",
    eyebrow: "Schools & libraries",
    title: "Bulk pricing from 25 books",
    body: "GST-compliant invoicing, free PAN-India delivery over ₹15,000, curation help included.",
    ctaLabel: "Shop activity kits",
    search: { category: "Activity Kits" },
    tone: "leaf",
    badge: "GST invoicing",
  },
];

export interface FeaturedCollection {
  id: string;
  title: string;
  note: string;
  /** Shopify Storefront search query. */
  query: string;
  search: { category?: string; age?: string };
}

export const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  {
    id: "new",
    title: "New this month",
    note: "Freshly landed in the Mumbai warehouse",
    query: "tag:new",
    search: {},
  },
  {
    id: "bestsellers",
    title: "Bestsellers this month",
    note: "What Indian families are reading right now",
    query: "tag:bestseller",
    search: {},
  },
  {
    id: "preschool",
    title: "Preschool favourites",
    note: "Ages 3–5 · picture books & rhymes",
    query: "tag:age-3-5",
    search: { age: "age-3-5" },
  },
];

export const TONE_CLASS: Record<PromoBanner["tone"], string> = {
  navy: "bg-navy text-navy-foreground",
  primary: "bg-primary text-primary-foreground",
  saffron: "bg-saffron text-saffron-foreground",
  leaf: "bg-leaf text-leaf-foreground",
};
