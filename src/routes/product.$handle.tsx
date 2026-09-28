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
  const images = node.images.edges;
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

  // When parent taps a variation pill, switch to variation photo if available
  const handleSelectVariant = (idx: number) => {
    setVariantIndex(idx);
    setShowVideo(false);
    const varImg = variants[idx]?.node.image?.url;
    if (varImg) {
      const imgIdx = images.findIndex((img) => img.node.url === varImg);
      if (imgIdx !== -1) {
        setActiveImage(imgIdx);
      }
    }
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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/shop" className="hover:text-primary">
          Shop
        </Link>{" "}
        / <span className="text-foreground">{node.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery / Video Media Section */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-secondary shadow-shelf">
            {showVideo && videoUrl ? (
              <div className="aspect-4/5 w-full bg-black flex items-center justify-center">
                {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={videoUrl.replace("watch?v=", "embed/")}
                    title={node.title}
                    className="h-full w-full"
                    allowFullScreen
                  />
                ) : (
                  <video src={videoUrl} controls autoPlay className="h-full w-full object-cover" />
                )}
              </div>
            ) : images[activeImage] ? (
              <img
                src={images[activeImage].node.url}
                alt={images[activeImage].node.altText ?? node.title}
                className="aspect-4/5 w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="flex aspect-4/5 items-center justify-center text-sm text-muted-foreground">
                No cover available
              </div>
            )}

            {!showVideo && images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                  aria-label="Previous image"
                  className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow-shelf transition-opacity hover:bg-background"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow-shelf transition-opacity hover:bg-background"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Media Thumbnails (Thumbnails + 1 Video Button) */}
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((img, i) => (
              <button
                key={img.node.url}
                onClick={() => {
                  setShowVideo(false);
                  setActiveImage(i);
                }}
                className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                  !showVideo && i === activeImage ? "border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={img.node.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}

            {/* Video preview thumb */}
            {videoUrl && (
              <button
                onClick={() => setShowVideo(true)}
                className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-secondary flex flex-col items-center justify-center gap-1 transition-colors ${
                  showVideo
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Video className="h-5 w-5" />
                <span className="text-[10px] font-bold">Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Buy Box */}
        <div>
          <p className="eyebrow">{node.productType || "Books"}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{node.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{node.description}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">{formatINR(price)}</span>
            {discount > 0 && compareAt && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatINR(compareAt)}</span>
                <span className="rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-0.5 text-xs font-bold">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          {/* Variations Pill Selector */}
          {variants.length > 1 && (
            <div className="mt-6">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Option / Series
              </Label>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {variants.map((v, idx) => {
                  const isSelected = idx === variantIndex;
                  return (
                    <button
                      key={v.node.id}
                      type="button"
                      onClick={() => handleSelectVariant(idx)}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {v.node.image?.url && (
                        <img
                          src={v.node.image.url}
                          alt=""
                          className="h-5 w-5 rounded object-cover border border-white/20"
                        />
                      )}
                      <span>{v.node.title}</span>
                      <span className={isSelected ? "text-primary-foreground/90 font-bold" : "text-muted-foreground"}>
                        {formatINR(v.node.price.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gift Wrap option */}
          <div className="mt-6 rounded-xl border border-border p-4 bg-secondary/20">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Gift className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-bold">Add Gift Wrapping</p>
                  <p className="text-[11px] text-muted-foreground">Hand-wrapped in Sana's signature gift pack</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{giftWrapFee > 0 ? `+${formatINR(giftWrapFee)}` : "Free"}</span>
                <input
                  type="checkbox"
                  checked={giftWrap}
                  onChange={(e) => setGiftWrap(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
            </label>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1 gap-2 font-bold shadow-sm" disabled={isLoading} onClick={add}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Add to Basket
            </Button>
            <Button size="lg" variant="secondary" className="flex-1 font-bold" onClick={buyNow}>
              Buy Now
            </Button>
          </div>

          <div className="mt-6">
            <ShippingEstimator subtotal={parseFloat(price)} />
          </div>
        </div>
      </div>

      {relatedItems.length > 0 && (
        <div className="mt-16">
          <ProductRail title="More Books for Your Shelf" products={relatedItems} />
        </div>
      )}
    </div>
  );
}
