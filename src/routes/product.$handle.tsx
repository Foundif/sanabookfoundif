import { ENQUIRY_ONLY_HANDLES, openEnquiry } from "@/lib/contact-info";
import { Label } from "@/components/ui/label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Gift,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Truck,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductRail } from "@/components/ProductRail";
import { FrequentlyBoughtTogether } from "@/components/FrequentlyBoughtTogether";
import { ProductReviews, Stars } from "@/components/ProductReviews";
import { ShippingEstimator } from "@/components/ShippingEstimator";
import { formatINR, productRating } from "@/lib/shopify";
import { fetchProductByHandle, fetchProducts } from "@/lib/catalog";
import { useCartStore } from "@/stores/cartStore";

const LANGUAGES = ["English", "Hindi", "Bilingual"] as const;

export const Route = createFileRoute("/product/$handle")({
  head: ({ params }) => {
    const name = params.handle
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} | Sanabooks India` },
        {
          name: "description",
          content: `Buy ${name} at Sanabooks India. Age guidance, ₹ pricing inclusive of taxes, pincode delivery check, COD and free shipping over ₹499.`,
        },
        { property: "og:title", content: `${name} | Sanabooks India` },
        {
          property: "og:description",
          content: `${name} — hand-picked by our children's librarians and shipped across India.`,
        },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { handle } = Route.useParams();
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const getCheckoutUrl = useCartStore((s) => s.getCheckoutUrl);
  const [activeImage, setActiveImage] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [childAge, setChildAge] = useState(4);
  const [language, setLanguage] = useState<string>("English");
  const [giftWrap, setGiftWrap] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
  });

  const { data: related } = useQuery({
    queryKey: ["products", "related"],
    queryFn: () => fetchProducts(12),
  });

  useEffect(() => {
    setActiveImage(0);
    setVariantIndex(0);
    setShowVideo(false);
  }, [handle]);

  if (loadingProduct) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2">
        <Skeleton className="aspect-4/5 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">We couldn't find that book</h1>
        <p className="mt-3 text-sm text-muted-foreground">It may have sold out or moved to a different shelf.</p>
        <Button className="mt-6" asChild>
          <Link to="/shop">Back to the library</Link>
        </Button>
      </div>
    );
  }

  const node = product.node;
  const variants = node.variants.edges;
  const variant = variants[variantIndex]?.node ?? variants[0]?.node;
  const compareAt = variant?.compareAtPrice?.amount;
  const price = variant?.price.amount ?? node.priceRange.minVariantPrice.amount;
  const discount =
    compareAt && parseFloat(compareAt) > parseFloat(price)
      ? Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100)
      : 0;
  const rating = productRating(product);
  const giftWrapFee = Number(node.gift_wrap_price ?? 0);
  const videoUrl = node.video_url;

  // Build the dynamic gallery: Selected variation's photos come first, followed by general photos
  const displayImages = (() => {
    const baseImages = node.images.edges;
    const variantNode = variants[variantIndex]?.node;
    const varImages: string[] = [];

    if (variantNode) {
      const anyVar = variantNode as unknown as { images?: string[]; image?: { url: string } };
      if (Array.isArray(anyVar.images) && anyVar.images.length > 0) {
        varImages.push(...anyVar.images);
      } else if (anyVar.image?.url) {
        varImages.push(anyVar.image.url);
      }
    }

    if (varImages.length > 0) {
      const combined = [
        ...varImages.map((url) => ({ node: { url, altText: variantNode?.title ?? node.title } })),
        ...baseImages.filter((b) => !varImages.includes(b.node.url)),
      ];
      return combined;
    }

    return baseImages;
  })();

  // When a variation is tapped, switch immediately to its photo
  const handleSelectVariant = (idx: number) => {
    setVariantIndex(idx);
    setShowVideo(false);
    setActiveImage(0);
  };

  const add = async () => {
    if (ENQUIRY_ONLY_HANDLES.includes(handle)) {
      openEnquiry(node.title, variant?.title);
      return;
    }
    if (!variant) return;

    const finalUnitPrice = parseFloat(variant.price.amount) + (giftWrap && giftWrapFee > 0 ? giftWrapFee : 0);
    const optionsWithWrap = [
      ...(variant.selectedOptions || []),
      ...(giftWrap
        ? [{ name: "Gift Wrap", value: giftWrapFee > 0 ? `Yes (+${formatINR(giftWrapFee)})` : "Yes (Free)" }]
        : []),
    ];

    await addItem({
      product,
      variantId: giftWrap && giftWrapFee > 0 ? `${variant.id}-gw` : variant.id,
      variantTitle: giftWrap && giftWrapFee > 0 ? `${variant.title} (Gift Wrapped)` : variant.title,
      price: { amount: String(finalUnitPrice), currencyCode: "INR" },
      quantity: 1,
      selectedOptions: optionsWithWrap,
    });
    toast.success("Added to basket", { description: node.title, position: "top-center" });
  };

  const buyNow = async () => {
    await add();
    const url = getCheckoutUrl();
    if (url) window.open(url, "_blank");
  };

  const relatedItems = (related ?? []).filter((p) => p.node.handle !== handle).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 w-full min-w-0 overflow-hidden">
      <nav className="text-xs text-muted-foreground truncate">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/shop" className="hover:text-primary">
          Shop
        </Link>{" "}
        / <span className="text-foreground">{node.title}</span>
      </nav>

      {/* Main Grid: w-full and min-w-0 prevent column blowout */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2 w-full min-w-0">
        {/* Gallery / Video Media Column */}
        <div className="w-full min-w-0 lg:sticky lg:top-28 lg:self-start">
          {/* Main Container: locked to w-full with aspect-square on mobile and aspect-4/5 on desktop */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary/40 to-secondary/10 shadow-shelf flex items-center justify-center p-3 sm:p-6 w-full aspect-square sm:aspect-4/5 select-none">
            {showVideo && videoUrl ? (
              <div className="h-full w-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
                {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={videoUrl.replace("watch?v=", "embed/")}
                    title={node.title}
                    className="h-full w-full"
                    allowFullScreen
                  />
                ) : (
                  <video src={videoUrl} controls autoPlay className="h-full w-full object-contain" />
                )}
              </div>
            ) : displayImages[activeImage] ? (
              <div className="relative flex h-full w-full items-center justify-center">
                <img
                  src={displayImages[activeImage].node.url}
                  alt={displayImages[activeImage].node.altText ?? node.title}
                  className="h-full w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/favicon.png";
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                  <BookOpen className="h-8 w-8 opacity-40" />
                </div>
                <p className="text-sm font-medium">No cover image available</p>
              </div>
            )}

            {!showVideo && displayImages.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((i) => (i - 1 + displayImages.length) % displayImages.length)}
                  aria-label="Previous image"
                  className="absolute top-1/2 left-2 sm:left-3 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow-shelf transition-opacity hover:bg-background"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveImage((i) => (i + 1) % displayImages.length)}
                  aria-label="Next image"
                  className="absolute top-1/2 right-2 sm:right-3 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow-shelf transition-opacity hover:bg-background"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Media Thumbnails Row */}
          <div className="mt-3 flex w-full max-w-full gap-2 sm:gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {displayImages.map((img, i) => (
              <button
                key={img.node.url}
                onClick={() => {
                  setShowVideo(false);
                  setActiveImage(i);
                }}
                className={`h-16 w-14 sm:h-20 sm:w-16 shrink-0 overflow-hidden rounded-md border-2 bg-secondary/30 p-1 flex items-center justify-center transition-all ${
                  !showVideo && i === activeImage
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <img src={img.node.url} alt="" className="h-full w-full object-contain" />
              </button>
            ))}

            {videoUrl && (
              <button
                onClick={() => setShowVideo(true)}
                className={`h-16 w-14 sm:h-20 sm:w-16 shrink-0 overflow-hidden rounded-md border-2 bg-secondary flex flex-col items-center justify-center gap-1 transition-colors ${
                  showVideo
                    ? "border-primary text-primary ring-1 ring-primary/40"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[9px] sm:text-[10px] font-bold">Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Details Section: add w-full min-w-0 */}
        <div className="w-full min-w-0 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {node.productType}
              </span>
              {node.tags.slice(0, 2).map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>

            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{node.title}</h1>

            <div className="mt-2 flex items-center gap-2">
              <Stars value={rating?.average ?? 0} />
              <span className="text-xs text-muted-foreground">({rating?.count ?? 0} parent reviews)</span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatINR(parseFloat(price))}</span>
              {compareAt && parseFloat(compareAt) > parseFloat(price) && (
                <>
                  <span className="text-base text-muted-foreground line-through">
                    {formatINR(parseFloat(compareAt))}
                  </span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent-foreground">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes. Free shipping over ₹499.</p>
          </div>

          {/* Variants Selector */}
          {variants.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Option / Variation
              </Label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <button
                    key={v.node.id}
                    onClick={() => handleSelectVariant(i)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      i === variantIndex
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card hover:bg-secondary text-foreground"
                    }`}
                  >
                    {v.node.title} — {formatINR(parseFloat(v.node.price.amount))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gift Wrapping Add-on Option */}
          {giftWrapFee > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Gift className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Eco-Friendly Gift Wrapping</p>
                    <p className="text-xs text-muted-foreground">Custom handmade wrap with a personalized name card.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={giftWrap ? "default" : "outline"}
                  onClick={() => setGiftWrap(!giftWrap)}
                  className="shrink-0 text-xs"
                >
                  {giftWrap ? "Added (+₹" + giftWrapFee + ")" : "+ Add (₹" + giftWrapFee + ")"}
                </Button>
              </div>
            </div>
          )}

          {/* Add to Cart / Buy Actions */}
          <div className="space-y-3 pt-2">
            <Button
              size="lg"
              className="w-full text-base font-semibold shadow-md"
              onClick={add}
              disabled={isLoading || !variant?.availableForSale}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-5 w-5" />
              )}
              {variant?.availableForSale ? "Add to Basket" : "Sold Out"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full text-base font-semibold"
              onClick={buyNow}
              disabled={isLoading || !variant?.availableForSale}
            >
              Buy Now with 1-Click
            </Button>
          </div>

          {/* Shipping Pincode Estimator */}
          <ShippingEstimator subtotal={parseFloat(price)} />

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary shrink-0" />
              <span>Fast Courier across India</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary shrink-0" />
              <span>7-Day Easy Replacement</span>
            </div>
          </div>

          {/* Book Description */}
          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Book Details</h2>
            <div className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
              {node.description || "Curated children's book with vibrant illustrations and engaging stories."}
            </div>
          </div>

          {/* Frequently Bought Together */}
          <FrequentlyBoughtTogether product={product} companions={relatedItems.slice(0, 2)} />

          {/* Customer Reviews */}
          <ProductReviews product={product} />
        </div>
      </div>

      {/* Related Books Rail */}
      {relatedItems.length > 0 && (
        <div className="mt-16 border-t border-border pt-12">
          <ProductRail title="You May Also Like" products={relatedItems} />
        </div>
      )}
    </div>
  );
}
