import { Link } from "@tanstack/react-router";
import { Loader2, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ProductReviews";
import { formatINR, productRating, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

function ageLabel(tags: string[]) {
  const tag = tags.find((t) => t.startsWith("age-")) ?? (tags.includes("adults") ? "adults" : "");
  if (!tag) return null;
  if (tag === "adults") return "Grown-ups";
  return `${tag.replace("age-", "").replace("-", "–")} yrs`;
}

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const node = product.node;
  const variant = node.variants.edges[0]?.node;
  const image = node.images.edges[0]?.node;
  const hoverImage = node.images.edges[1]?.node;
  const compareAt = variant?.compareAtPrice?.amount;
  const price = variant?.price.amount ?? node.priceRange.minVariantPrice.amount;
  const discount =
    compareAt && parseFloat(compareAt) > parseFloat(price)
      ? Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100)
      : 0;
  const age = ageLabel(node.tags);
  const rating = productRating(product);
  const freeShip = parseFloat(price) >= 499;

  const handleAddToCart = async () => {
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("Added to basket", {
      description: node.title,
      position: "top-center",
    });
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-shelf transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
      <Link
        to="/product/$handle"
        params={{ handle: node.handle }}
        className="relative block aspect-4/5 overflow-hidden bg-secondary"
      >
        {image ? (
          <>
            <img
              src={image.url}
              alt={image.altText ?? node.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {hoverImage && (
              <img
                src={hoverImage.url}
                alt=""
                loading="lazy"
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No cover
          </div>
        )}

        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-navy/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <span className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold text-saffron-foreground">
              {discount}% off
            </span>
          )}
          {node.tags.includes("bestseller") && (
            <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-navy-foreground">
              Bestseller
            </span>
          )}
          {node.tags.includes("bundle") && (
            <span className="rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold text-leaf-foreground">
              Bundle
            </span>
          )}
        </span>

        {age && (
          <span className="absolute top-2 right-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-shelf">
            {age}
          </span>
        )}

        <span className="absolute bottom-2 left-2 rounded-full bg-surface/95 px-2.5 py-1 text-[10px] font-bold text-primary opacity-0 shadow-shelf transition-all duration-300 group-hover:opacity-100">
          Quick view
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow truncate">{node.productType || "Books"}</p>
            {rating && (
              <span className="flex shrink-0 items-center gap-1">
                <Stars value={rating.average} />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {rating.average.toFixed(1)}
                </span>
              </span>
            )}
          </div>

          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            className="mt-1 line-clamp-2 text-sm font-bold hover:text-primary"
          >
            {node.title}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {node.description}
          </p>
        </div>

        {/* Price, shipping note and CTA are pinned to the bottom of every card so
            the Add to cart button always lands at the same height and size,
            no matter how long the title/description above it run. */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold">{formatINR(price)}</span>
            {discount > 0 && compareAt && (
              <span className="text-xs text-muted-foreground line-through">
                {formatINR(compareAt)}
              </span>
            )}
          </div>

          <p className="mt-1 flex h-4 items-center gap-1 text-[11px] font-semibold text-leaf">
            {freeShip && (
              <>
                <Truck className="h-3 w-3" /> Free shipping
              </>
            )}
          </p>

          <Button
            onClick={handleAddToCart}
            disabled={isLoading || !variant}
            className="mt-2 w-full rounded-full"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" /> Add to cart
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
