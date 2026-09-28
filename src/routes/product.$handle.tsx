```tsx
import { ENQUIRY_ONLY_HANDLES, openEnquiry } from "@/lib/contact-info";
import { Label } from "@/components/ui/label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
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
import {
  fetchProductByHandle,
  fetchProducts,
} from "@/lib/catalog";

import { useCartStore } from "@/stores/cartStore";

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/product/$handle")({
  head: ({ params }) => {
    const name = params.handle
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1),
      )
      .join(" ");

    return {
      meta: [
        {
          title: `${name} | Sanabooks India`,
        },
        {
          name: "description",
          content: `Buy ${name} at Sanabooks India. Age guidance, ₹ pricing inclusive of taxes, pincode delivery check, COD and free shipping over ₹499.`,
        },
        {
          property: "og:title",
          content: `${name} | Sanabooks India`,
        },
        {
          property: "og:description",
          content: `${name} — hand-picked by our children's librarians and shipped across India.`,
        },
      ],
    };
  },

  component: ProductDetail,
});

/* -------------------------------------------------------------------------- */
/* Custom catalogue types                                                     */
/* -------------------------------------------------------------------------- */

/*
 * ShopifyProduct is shared with the existing catalogue code.
 *
 * The custom catalogue additionally adds:
 * - gift_wrap_price
 * - video_url
 *
 * These fields may not exist in the original Shopify type, so we keep the
 * cast local to this page instead of changing the whole Shopify model.
 */

type CustomProductNode = {
  gift_wrap_price?: number | null;
  video_url?: string | null;
};

type VariantMedia = {
  images?: string[];
  image?: {
    url?: string;
    altText?: string | null;
  } | null;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function ProductDetail() {
  const { handle } = Route.useParams();

  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const getCheckoutUrl = useCartStore(
    (state) => state.getCheckoutUrl,
  );

  const [activeImage, setActiveImage] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [giftWrap, setGiftWrap] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Product query                                                            */
  /* ------------------------------------------------------------------------ */

  const {
    data: product,
    isLoading: loadingProduct,
  } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
  });

  /* ------------------------------------------------------------------------ */
  /* Related products                                                         */
  /* ------------------------------------------------------------------------ */

  const { data: related } = useQuery({
    queryKey: ["products", "related"],
    queryFn: () => fetchProducts(12),
  });

  /* ------------------------------------------------------------------------ */
  /* Reset product UI when handle changes                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setActiveImage(0);
    setVariantIndex(0);
    setGiftWrap(false);
    setShowVideo(false);
  }, [handle]);

  /* ------------------------------------------------------------------------ */
  /* Loading state                                                             */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Not found                                                                */
  /* ------------------------------------------------------------------------ */

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">
          We couldn't find that book
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          It may have sold out or moved to a different shelf.
        </p>

        <Button className="mt-6" asChild>
          <Link to="/shop">
            Back to the library
          </Link>
        </Button>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Product data                                                             */
  /* ------------------------------------------------------------------------ */

  const node = product.node;

  const variants = node.variants?.edges ?? [];

  const safeVariantIndex =
    variantIndex >= 0 &&
    variantIndex < variants.length
      ? variantIndex
      : 0;

  const variant =
    variants[safeVariantIndex]?.node ??
    variants[0]?.node;

  /*
   * Access custom catalogue fields safely.
   */
  const customNode =
    node as typeof node & CustomProductNode;

  const giftWrapFee = Number(
    customNode.gift_wrap_price ?? 0,
  );

  const videoUrl =
    typeof customNode.video_url === "string" &&
    customNode.video_url.trim().length > 0
      ? customNode.video_url.trim()
      : null;

  /* ------------------------------------------------------------------------ */
  /* Price                                                                     */
  /* ------------------------------------------------------------------------ */

  const compareAt =
    variant?.compareAtPrice?.amount ?? null;

  const price =
    variant?.price?.amount ??
    node.priceRange?.minVariantPrice?.amount ??
    "0";

  const numericPrice = Number(price) || 0;
  const numericCompareAt = Number(compareAt) || 0;

  const discount =
    numericCompareAt > numericPrice &&
    numericCompareAt > 0
      ? Math.round(
          (1 - numericPrice / numericCompareAt) * 100,
        )
      : 0;

  /* ------------------------------------------------------------------------ */
  /* Rating                                                                    */
  /* ------------------------------------------------------------------------ */

  const rating = productRating(product);

  /* ------------------------------------------------------------------------ */
  /* Gallery                                                                   */
  /* ------------------------------------------------------------------------ */

  const baseImages =
    node.images?.edges ?? [];

  const variantMedia =
    variant as typeof variant & VariantMedia;

  const variantImages = Array.isArray(
    variantMedia?.images,
  )
    ? variantMedia.images.filter(
        (url): url is string =>
          typeof url === "string" &&
          url.trim().length > 0,
      )
    : variantMedia?.image?.url
      ? [variantMedia.image.url]
      : [];

  const displayImages =
    variantImages.length > 0
      ? [
          ...variantImages.map((url) => ({
            node: {
              url,
              altText:
                variant?.title ??
                node.title,
            },
          })),
          ...baseImages.filter(
            (image) =>
              !variantImages.includes(
                image.node.url,
              ),
          ),
        ]
      : baseImages;

  /* ------------------------------------------------------------------------ */
  /* Variant selection                                                         */
  /* ------------------------------------------------------------------------ */

  const handleSelectVariant = (
    index: number,
  ) => {
    setVariantIndex(index);
    setActiveImage(0);
    setShowVideo(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Add to cart                                                               */
  /* ------------------------------------------------------------------------ */

  const add = async () => {
    if (
      ENQUIRY_ONLY_HANDLES.includes(handle)
    ) {
      openEnquiry(
        node.title,
        variant?.title,
      );
      return;
    }

    if (!variant) {
      toast.error(
        "This product is currently unavailable.",
      );
      return;
    }

    const baseVariantPrice =
      Number(variant.price.amount) || 0;

    const finalUnitPrice =
      baseVariantPrice +
      (giftWrap && giftWrapFee > 0
        ? giftWrapFee
        : 0);

    const optionsWithWrap = [
      ...(variant.selectedOptions ?? []),

      ...(giftWrap
        ? [
            {
              name: "Gift Wrap",
              value:
                giftWrapFee > 0
                  ? `Yes (+${formatINR(
                      giftWrapFee,
                    )})`
                  : "Yes (Free)",
            },
          ]
        : []),
    ];

    await addItem({
      product,

      variantId:
        giftWrap && giftWrapFee > 0
          ? `${variant.id}-gw`
          : variant.id,

      variantTitle:
        giftWrap && giftWrapFee > 0
          ? `${variant.title} (Gift Wrapped)`
          : variant.title,

      price: {
        amount: String(finalUnitPrice),
        currencyCode: "INR",
      },

      quantity: 1,

      selectedOptions: optionsWithWrap,
    });

    toast.success("Added to basket", {
      description: node.title,
      position: "top-center",
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Buy now                                                                   */
  /* ------------------------------------------------------------------------ */

  const buyNow = async () => {
    await add();

    const url = getCheckoutUrl();

    if (url) {
      window.open(url, "_blank");
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Related products                                                          */
  /* ------------------------------------------------------------------------ */

  const relatedItems = (related ?? [])
    .filter(
      (item) =>
        item.node.handle !== handle,
    )
    .slice(0, 4);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link
          to="/"
          className="hover:text-primary"
        >
          Home
        </Link>

        {" / "}

        <Link
          to="/shop"
          className="hover:text-primary"
        >
          Shop
        </Link>

        {" / "}

        <span className="text-foreground">
          {node.title}
        </span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* ================================================================== */}
        {/* Gallery                                                             */}
        {/* ================================================================== */}

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-secondary shadow-shelf">
            {showVideo && videoUrl ? (
              <div className="flex aspect-4/5 w-full items-center justify-center bg-black">
                {videoUrl.includes(
                  "youtube.com",
                ) ||
                videoUrl.includes(
                  "youtu.be",
                ) ? (
                  <iframe
                    src={videoUrl
                      .replace(
                        "watch?v=",
                        "embed/",
                      )
                      .split("&")[0]}
                    title={node.title}
                    className="h-full w-full"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            ) : displayImages[
                activeImage
              ] ? (
              <img
                src={
                  displayImages[
                    activeImage
                  ].node.url
                }
                alt={
                  displayImages[
                    activeImage
                  ].node.altText ??
                  node.title
                }
                className="aspect-4/5 w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="flex aspect-4/5 items-center justify-center text-sm text-muted-foreground">
                No cover available
              </div>
            )}

            {/* Previous / next */}
            {!showVideo &&
              displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImage(
                        (current) =>
                          (current -
                            1 +
                            displayImages.length) %
                          displayImages.length,
                      )
                    }
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow-shelf transition-colors hover:bg-background"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveImage(
                        (current) =>
                          (current + 1) %
                          displayImages.length,
                      )
                    }
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow-shelf transition-colors hover:bg-background"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
          </div>

          {/* Thumbnails */}
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {displayImages.map(
              (image, index) => (
                <button
                  type="button"
                  key={`${image.node.url}-${index}`}
                  onClick={() => {
                    setShowVideo(false);
                    setActiveImage(index);
                  }}
                  aria-label={`View image ${
                    index + 1
                  }`}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    !showVideo &&
                    index ===
                      activeImage
                      ? "border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <img
                    src={image.node.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ),
            )}

            {/* Video */}
            {videoUrl && (
              <button
                type="button"
                onClick={() =>
                  setShowVideo(true)
                }
                className={`flex h-20 w-16 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border-2 bg-secondary transition-colors ${
                  showVideo
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Video className="h-5 w-5" />

                <span className="text-[10px] font-bold">
                  Video
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* Product Details                                                     */}
        {/* ================================================================== */}

        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {node.productType}
              </span>

              {(node.tags ?? [])
                .slice(0, 2)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              {node.title}
            </h1>

            <div className="mt-2 flex items-center gap-2">
              <Stars
                rating={rating.rating}
              />

              <span className="text-xs text-muted-foreground">
                ({rating.reviewCount} parent
                reviews)
              </span>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatINR(numericPrice)}
              </span>

              {numericCompareAt >
                numericPrice && (
                <>
                  <span className="text-base text-muted-foreground line-through">
                    {formatINR(
                      numericCompareAt,
                    )}
                  </span>

                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent-foreground">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Inclusive of all taxes. Free
              shipping over ₹499.
            </p>
          </div>

          {/* ================================================================= */}
          {/* Variants                                                          */}
          {/* ================================================================= */}

          {variants.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Option / Variation
              </Label>

              <div className="flex flex-wrap gap-2">
                {variants.map(
                  (item, index) => (
                    <button
                      type="button"
                      key={item.node.id}
                      onClick={() =>
                        handleSelectVariant(
                          index,
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        index ===
                        safeVariantIndex
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {item.node.title} —{" "}
                      {formatINR(
                        Number(
                          item.node.price
                            .amount,
                        ) || 0,
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* Gift Wrap                                                         */}
          {/* ================================================================= */}

          {giftWrapFee > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Gift className="h-5 w-5 shrink-0 text-primary" />

                  <div>
                    <p className="text-sm font-semibold">
                      Eco-Friendly Gift Wrapping
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Custom handmade wrap with
                      a personalized name card.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    giftWrap
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setGiftWrap(
                      (current) =>
                        !current,
                    )
                  }
                  className="shrink-0 text-xs"
                >
                  {giftWrap
                    ? `Added (+₹${giftWrapFee})`
                    : `+ Add (₹${giftWrapFee})`}
                </Button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* Cart / Buy                                                        */}
          {/* ================================================================= */}

          <div className="space-y-3 pt-2">
            <Button
              size="lg"
              className="w-full text-base font-semibold shadow-md"
              onClick={add}
              disabled={
                isLoading ||
                !variant?.availableForSale
              }
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-5 w-5" />
              )}

              {variant?.availableForSale
                ? "Add to Basket"
                : "Sold Out"}
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="w-full text-base font-semibold"
              onClick={buyNow}
              disabled={
                isLoading ||
                !variant?.availableForSale
              }
            >
              Buy Now with 1-Click
            </Button>
          </div>

          {/* Shipping */}
          <ShippingEstimator
            subtotal={numericPrice}
          />

          {/* ================================================================= */}
          {/* Trust                                                             */}
          {/* ================================================================= */}

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Fast Courier across India
              </span>
            </div>

            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
              <span>
                7-Day Easy Replacement
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* Description                                                       */}
          {/* ================================================================= */}

          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Book Details
            </h2>

            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {node.description ||
                "Curated children's book with vibrant illustrations and engaging stories."}
            </div>
          </div>

          {/* Frequently bought */}
          <FrequentlyBoughtTogether
            currentHandle={handle}
          />

          {/* Reviews */}
          <ProductReviews
            handle={handle}
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Related Books                                                        */}
      {/* ==================================================================== */}

      {relatedItems.length > 0 && (
        <div className="mt-16 border-t border-border pt-12">
          <ProductRail
            title="You May Also Like"
            items={relatedItems}
          />
        </div>
      )}
    </div>
  );
}
```
