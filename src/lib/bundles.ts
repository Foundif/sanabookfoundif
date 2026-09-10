/**
 * Bundle & gift pack lineup for Sanabooks India.
 * These sit alongside the book catalogue and are shoppable like any other product.
 */
import type { ShopifyProduct } from "@/lib/shopify";
import firstSteps from "@/assets/bundles/first-steps.jpg";
import traceLearn from "@/assets/bundles/trace-learn.jpg";
import phonicsPower from "@/assets/bundles/phonics-power.jpg";
import colourCreate from "@/assets/bundles/colour-create.jpg";
import wipeWrite from "@/assets/bundles/wipe-write-repeat.jpg";
import littleLearner from "@/assets/bundles/little-learner.jpg";
import kindergarten from "@/assets/bundles/kindergarten-kickstart.jpg";
import giftBox from "@/assets/bundles/little-scholar-gift-box.jpg";
import partyPals from "@/assets/bundles/party-pals-goodie-bags.jpg";

export interface BundleSpec {
  handle: string;
  emoji: string;
  title: string;
  ageLabel: string;
  ageTag: string;
  includes: string[];
  description: string;
  price: number;
  worth: number;
  image: string;
  badge?: string;
  variants?: Array<{ label: string; price: number; note: string }>;
}

export const BUNDLES: BundleSpec[] = [
  {
    handle: "first-steps-pack",
    emoji: "🧸",
    title: "First Steps Pack",
    ageLabel: "Ages 1–3",
    ageTag: "age-0-2",
    includes: ["Early-learning book", "Basic tracing book", "Colouring book"],
    description:
      "The gentlest possible start: chunky early-learning pages, first tracing lines and big, forgiving colouring shapes for little hands still finding their grip.",
    price: 199,
    worth: 249,
    image: firstSteps,
  },
  {
    handle: "trace-and-learn-combo",
    emoji: "✏️",
    title: "Trace & Learn Combo",
    ageLabel: "Ages 3–5",
    ageTag: "age-3-5",
    includes: ["Tracing books", "Wipe-clean tracing set"],
    description:
      "Pencil control, the easy way. Paper tracing books for daily practice plus a wipe-clean set your child can redo again and again without wasting a page.",
    price: 149,
    worth: 199,
    image: traceLearn,
  },
  {
    handle: "phonics-power-pack",
    emoji: "🔤",
    title: "Phonics Power Pack",
    ageLabel: "Ages 4–6",
    ageTag: "age-3-5",
    includes: ["Phonics books", "Wipe-clean phonics sheets"],
    description:
      "Sounds before spellings. Guided phonics books paired with wipe-clean sheets so blending practice becomes a five-minute daily habit rather than a chore.",
    price: 299,
    worth: 399,
    image: phonicsPower,
  },
  {
    handle: "colour-and-create-pack",
    emoji: "🖍️",
    title: "Colour & Create Pack",
    ageLabel: "Ages 3–7",
    ageTag: "age-3-5",
    includes: ["Colouring books", "Activity books"],
    description:
      "For the child who cannot sit still. Colouring spreads and puzzle-packed activity books that keep hands busy on flights, long afternoons and rainy days.",
    price: 199,
    worth: 279,
    image: colourCreate,
  },
  {
    handle: "wipe-write-repeat-pack",
    emoji: "♻️",
    title: "Wipe-Write-Repeat Pack",
    ageLabel: "Ages 3–6",
    ageTag: "age-3-5",
    includes: ["Letters write-wipe set", "Numbers write-wipe set", "Shapes write-wipe set"],
    description:
      "The complete write-wipe-clean set — letters, numbers and shapes. Practise, wipe, practise again. One purchase that lasts a whole school year.",
    price: 299,
    worth: 399,
    image: wipeWrite,
  },
  {
    handle: "little-learner-bundle",
    emoji: "⭐",
    title: "Little Learner Bundle",
    ageLabel: "Ages 3–5",
    ageTag: "age-3-5",
    includes: ["Early-learning book", "Tracing book", "Colouring book", "Phonics book"],
    description:
      "Our bestseller. Four books that cover the whole preschool spread — early concepts, pencil control, colouring and phonics — in one age-matched box.",
    price: 499,
    worth: 699,
    image: littleLearner,
    badge: "Bestseller",
  },
  {
    handle: "kindergarten-kickstart",
    emoji: "🚀",
    title: "Kindergarten Kickstart",
    ageLabel: "Ages 4–6",
    ageTag: "age-3-5",
    includes: [
      "Early-learning book",
      "Activity book",
      "Phonics book",
      "Wipe-clean set",
      "Colouring book",
    ],
    description:
      "The complete set for the year before big school. Five titles that build reading readiness, writing stamina and confidence — sequenced so nothing feels sudden.",
    price: 799,
    worth: 1099,
    image: kindergarten,
    badge: "Complete set",
  },
  {
    handle: "little-scholar-gift-box",
    emoji: "🎁",
    title: "The Little Scholar Gift Box",
    ageLabel: "Ages 4–7",
    ageTag: "age-6-8",
    includes: ["Curated premium learning set", "Gift wrapping", "Handwritten note card"],
    description:
      "A hand-packed navy keepsake box with a curated premium learning set, tissue wrap and a note card. Ready to gift the moment it arrives.",
    price: 999,
    worth: 1299,
    image: giftBox,
    badge: "Gifting",
  },
  {
    handle: "party-pals-goodie-bags",
    emoji: "🎉",
    title: "Party Pals Goodie Bags",
    ageLabel: "Ages 3–8",
    ageTag: "age-6-8",
    includes: ["Mini activity book per bag", "Crayons", "Ribbon-tied paper bag"],
    description:
      "Return gifts parents actually thank you for. Each bag holds a mini activity book and crayons — the more bags you order, the lower the price per bag.",
    price: 790,
    worth: 990,
    image: partyPals,
    badge: "Return gifts",
    variants: [
      { label: "10 bags", price: 790, note: "₹79 each" },
      { label: "20 bags", price: 1380, note: "₹69 each" },
      { label: "50 bags", price: 2950, note: "₹59 each" },
    ],
  },
];

function toProduct(b: BundleSpec): ShopifyProduct {
  const variants = b.variants ?? [{ label: "1 pack", price: b.price, note: "" }];
  const worthRatio = b.worth / b.price;
  return {
    node: {
      id: `bundle:${b.handle}`,
      title: b.title,
      description: `${b.description} Includes: ${b.includes.join(", ")}.`,
      handle: b.handle,
      productType: "Bundles",
      tags: ["bundle", b.ageTag, "english", ...(b.badge === "Bestseller" ? ["bestseller"] : [])],
      priceRange: { minVariantPrice: { amount: String(b.price), currencyCode: "INR" } },
      compareAtPriceRange: { minVariantPrice: { amount: String(b.worth), currencyCode: "INR" } },
      images: { edges: [{ node: { url: b.image, altText: `${b.title} contents` } }] },
      variants: {
        edges: variants.map((v) => ({
          node: {
            id: `bundle:${b.handle}:${v.label}`,
            title: v.label,
            price: { amount: String(v.price), currencyCode: "INR" },
            compareAtPrice: {
              amount: String(Math.round(v.price * worthRatio)),
              currencyCode: "INR",
            },
            availableForSale: true,
            selectedOptions: [{ name: "Pack size", value: v.label }],
          },
        })),
      },
      options: [{ name: "Pack size", values: variants.map((v) => v.label) }],
    },
  };
}

export const BUNDLE_PRODUCTS: ShopifyProduct[] = BUNDLES.map(toProduct);

export function bundleByHandle(handle: string) {
  return BUNDLES.find((b) => b.handle === handle) ?? null;
}
