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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductRail } from "@/components/ProductRail";
import { FrequentlyBoughtTogether } from "@/components/FrequentlyBoughtTogether";
import { ProductReviews, Stars } from "@/components/ProductReviews";
import { ShippingEstimator } from "@/components/ShippingEstimator";
import { fetchProductByHandle, fetchProducts, formatINR, productRating } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";


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
  }, [handle]);

  if (loadingProduct) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2">
        <Skeleton className="aspect-4/5 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
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
        <p className="mt-3 text-sm text-muted-foreground">
          It may have sold out or moved to a different shelf.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/shop">Back to the library</Link>
        </Button>
      </div>
    );
  }

  const node = product.node;
  const images = node.images.edges;
  const variant = node.variants.edges[variantIndex]?.node ?? node.variants.edges[0]?.node;
  const compareAt = variant?.compareAtPrice?.amount;
  const price = variant?.price.amount ?? node.priceRange.minVariantPrice.amount;
  const discount =
    compareAt && parseFloat(compareAt) > parseFloat(price)
      ? Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100)
      : 0;
  const ageTag = node.tags.find((t) => t.startsWith("age-"));
  const ageRange = ageTag ? ageTag.replace("age-", "").split("-") : null;
  const rating = productRating(product);



  const add = async () => {
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
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
        {/* Gallery slider */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-secondary shadow-shelf">
            {images[activeImage] ? (
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

            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImage((i) => (i - 1 + images.length) % images.length)
                  }
                  aria-label="Previous image"
                  className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-primary shadow-shelf transition-opacity hover:bg-surface"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-primary shadow-shelf transition-opacity hover:bg-surface"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((img, i) => (
                    <span
                      key={`dot-${img.node.url}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeImage ? "w-5 bg-primary" : "w-1.5 bg-surface/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((img, i) => (
                <button
                  key={img.node.url}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    i === activeImage ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <img src={img.node.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div>
          <p className="eyebrow">{node.productType || "Books"}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{node.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{node.description}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">{formatINR(price)}</span>
            {discount > 0 && compareAt && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatINR(compareAt)}
                </span>
                <span className="rounded-full bg-saffron px-2.5 py-0.5 text-xs font-bold text-saffron-foreground">
                  Save {discount}%
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Inclusive of all taxes · Free shipping over ₹499
          </p>
          {rating ? (
            <div className="mt-3 flex items-center gap-2">
              <Stars value={rating.average} />
              <span className="text-xs font-semibold">
                {rating.average.toFixed(1)} · {rating.count} verified{" "}
                {rating.count === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No reviews yet</p>
          )}


          {/* Age recommender */}
          {ageRange && (
            <div className="mt-7 rounded-xl border border-border bg-card p-4">
              <p className="eyebrow">Right for your child?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => {
                  const inRange =
                    year >= parseInt(ageRange[0] ?? "0") && year <= parseInt(ageRange[1] ?? "0");
                  return (
                    <span
                      key={year}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                        inRange
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {year}y
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-leaf">
                <BookOpen className="h-3.5 w-3.5" />
                Best read with {ageRange[0]}–{ageRange[1]} year olds
              </p>
            </div>
          )}

          {/* Variant picker */}
          {node.variants.edges.length > 1 && (
            <div className="mt-6">
              <p className="eyebrow">{node.options[0]?.name ?? "Option"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {node.variants.edges.map((v, i) => (
                  <button
                    key={v.node.id}
                    onClick={() => setVariantIndex(i)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${
                      i === variantIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-secondary"
                    }`}
                  >
                    {v.node.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" className="flex-1 rounded-full" onClick={add} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 rounded-full border-primary text-primary"
              onClick={buyNow}
              disabled={isLoading}
            >
              Buy now
            </Button>
          </div>

          {/* Pincode-based shipping options & delivery dates */}
          <div className="mt-6">
            <ShippingEstimator subtotal={parseFloat(price)} />
          </div>


          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, label: "Free shipping over ₹499" },
              { icon: RotateCcw, label: "Easy 7-day returns" },
              { icon: Gift, label: "Gift wrap available" },
            ].map((f) => (
              <li key={f.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <f.icon className="h-4 w-4 shrink-0 text-primary" />
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FrequentlyBoughtTogether product={product} companions={relatedItems} />

      <ProductReviews product={product} />

      {/* You may also like */}
      <div className="mt-16">
        <ProductRail
          products={relatedItems}
          eyebrow="You may also like"
          title="More from the same shelf"
          action={
            <Button variant="ghost" className="text-primary" asChild>
              <Link to="/shop">See all</Link>
            </Button>
          }
        />
      </div>

      {/* Sticky purchase bar */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-16 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{node.title}</p>
            <p className="text-sm font-bold">{formatINR(price)}</p>
          </div>
          <Button className="shrink-0 rounded-full" onClick={add} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
