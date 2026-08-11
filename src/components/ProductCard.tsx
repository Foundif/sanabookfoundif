import { Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, type ShopifyProduct } from "@/lib/shopify";
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
  const compareAt = variant?.compareAtPrice?.amount;
  const price = variant?.price.amount ?? node.priceRange.minVariantPrice.amount;
  const discount =
    compareAt && parseFloat(compareAt) > parseFloat(price)
      ? Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100)
      : 0;
  const age = ageLabel(node.tags);

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
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-shelf transition-shadow hover:shadow-lift">
      <Link
        to="/product/$handle"
        params={{ handle: node.handle }}
        className="relative block aspect-4/5 overflow-hidden bg-secondary"
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No cover
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold text-saffron-foreground">
            {discount}% off
          </span>
        )}
        {age && (
          <span className="absolute top-2 right-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-primary">
            {age}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <p className="eyebrow">{node.productType || "Books"}</p>
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

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-bold">{formatINR(price)}</span>
          {discount > 0 && compareAt && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(compareAt)}
            </span>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={isLoading || !variant}
          className="mt-3 w-full"
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
    </article>
  );
}
