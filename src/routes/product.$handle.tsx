import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Gift,
  Loader2,
  MapPin,
  RotateCcw,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { fetchProductByHandle, fetchProducts, formatINR } from "@/lib/shopify";
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
  component: ProductDetail;
});

function ProductDetail() {
  const { handle } = Route.useParams();
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const getCheckoutUrl = useCartStore((s) => s.getCheckoutUrl);
  const [activeImage, setActiveImage] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [pincode, setPincode] = useState("");
  const [pincodeChecked, setPincodeChecked] = useState(false);

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
    setPincodeChecked(false);
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
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-secondary">
            {images[activeImage] ? (
              <img
                src={images[activeImage].node.url}
                alt={images[activeImage].node.altText ?? node.title}
                className="aspect-4/5 w-full object-cover"
              />
            ) : (
              <div className="flex aspect-4/5 items-center justify-center text-sm text-muted-foreground">
                No cover available
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {images.map((img, i) => (
                <button
                  key={img.node.url}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-20 w-16 overflow-hidden rounded-md border-2 ${
                    i === activeImage ? "border-primary" : "border-border"
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

          {/* Pincode check */}
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="eyebrow flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Delivery check
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPincodeChecked(false);
                }}
                placeholder="Enter 6-digit pincode"
                inputMode="numeric"
                aria-label="Pincode"
              />
              <Button
                variant="secondary"
                onClick={() => setPincodeChecked(pincode.length === 6)}
                disabled={pincode.length !== 6}
              >
                Check
              </Button>
            </div>
            {pincodeChecked && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-leaf">
                <Check className="h-3.5 w-3.5" /> Delivers to {pincode} in 3–4 days · COD available
              </p>
            )}
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

      {/* Reviews */}
      <section className="mt-16 rounded-xl border border-border bg-card p-8">
        <h2 className="text-xl font-bold">Reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No reviews yet. Verified reviews from parents will appear here once orders start shipping.
        </p>
      </section>

      {/* Related */}
      {relatedItems.length > 0 && (
        <section className="mt-16">
          <p className="eyebrow">Frequently bought together</p>
          <h2 className="mt-2 text-2xl font-bold">More from the shelf</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
