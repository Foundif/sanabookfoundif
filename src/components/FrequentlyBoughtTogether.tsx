import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatINR, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

/** "Frequently bought together" bundle module: the current book plus two shelf-mates. */
export function FrequentlyBoughtTogether({
  product,
  companions,
}: {
  product: ShopifyProduct;
  companions: ShopifyProduct[];
}) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const bundle = useMemo(
    () => [product, ...companions.slice(0, 2)],
    [product, companions],
  );
  const [selected, setSelected] = useState<string[]>(() => bundle.map((b) => b.node.id));

  if (bundle.length < 2) return null;

  const chosen = bundle.filter((b) => selected.includes(b.node.id));
  const total = chosen.reduce(
    (sum, b) =>
      sum +
      parseFloat(b.node.variants.edges[0]?.node.price.amount ?? b.node.priceRange.minVariantPrice.amount),
    0,
  );
  const compareTotal = chosen.reduce((sum, b) => {
    const v = b.node.variants.edges[0]?.node;
    const c = v?.compareAtPrice?.amount;
    return sum + parseFloat(c ?? v?.price.amount ?? b.node.priceRange.minVariantPrice.amount);
  }, 0);
  const saving = Math.max(0, Math.round(compareTotal - total));

  const addAll = async () => {
    for (const b of chosen) {
      const v = b.node.variants.edges[0]?.node;
      if (!v) continue;
      await addItem({
        product: b,
        variantId: v.id,
        variantTitle: v.title,
        price: v.price,
        quantity: 1,
        selectedOptions: v.selectedOptions || [],
      });
    }
    toast.success(`${chosen.length} books added to basket`, { position: "top-center" });
  };

  return (
    <section className="mt-16 rounded-2xl border border-border bg-card p-6 shadow-shelf sm:p-8">
      <p className="eyebrow">Frequently bought together</p>
      <h2 className="mt-2 text-2xl font-bold">Build the set</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-4">
          {bundle.map((b, i) => {
            const image = b.node.images.edges[0]?.node;
            const checked = selected.includes(b.node.id);
            return (
              <div key={b.node.id} className="flex items-center gap-4">
                {i > 0 && <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <div className="w-[130px]">
                  <Link
                    to="/product/$handle"
                    params={{ handle: b.node.handle }}
                    className="block overflow-hidden rounded-lg border border-border bg-secondary"
                  >
                    {image && (
                      <img
                        src={image.url}
                        alt={image.altText ?? b.node.title}
                        loading="lazy"
                        className={`aspect-4/5 w-full object-cover transition-opacity ${
                          checked ? "" : "opacity-40"
                        }`}
                      />
                    )}
                  </Link>
                  <label className="mt-2 flex items-start gap-2 text-xs leading-snug">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setSelected((prev) =>
                          prev.includes(b.node.id)
                            ? prev.filter((id) => id !== b.node.id)
                            : [...prev, b.node.id],
                        )
                      }
                      aria-label={`Include ${b.node.title}`}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="line-clamp-2 font-semibold">{b.node.title}</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {formatINR(
                          b.node.variants.edges[0]?.node.price.amount ??
                            b.node.priceRange.minVariantPrice.amount,
                        )}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-secondary p-5 lg:w-64">
          <p className="text-xs text-muted-foreground">
            {chosen.length} {chosen.length === 1 ? "book" : "books"} selected
          </p>
          <p className="mt-1 text-2xl font-bold">{formatINR(total)}</p>
          {saving > 0 && (
            <p className="mt-1 text-xs font-semibold text-leaf">
              You save {formatINR(saving)} vs. list price
            </p>
          )}
          <Button
            className="mt-4 w-full rounded-full"
            onClick={addAll}
            disabled={isLoading || chosen.length === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" /> Add selected
              </>
            )}
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Free shipping over ₹499 · gift wrap available at checkout
          </p>
        </div>
      </div>
    </section>
  );
}
