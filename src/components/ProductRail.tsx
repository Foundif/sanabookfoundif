import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopifyProduct } from "@/lib/shopify";

/** Horizontally scrollable product slider with arrow controls. */
export function ProductRail({
  products,
  isLoading = false,
  eyebrow,
  title,
  action,
}: {
  products: ShopifyProduct[];
  isLoading?: boolean;
  eyebrow?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 720), behavior: "smooth" });
  };

  if (!isLoading && products.length === 0) return null;

  return (
    <section>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <Button
            variant="outline"
            size="icon"
            className="hidden rounded-full sm:inline-flex"
            aria-label="Scroll left"
            onClick={() => nudge(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden rounded-full sm:inline-flex"
            aria-label="Scroll right"
            onClick={() => nudge(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scroller}
        className="-mx-4 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-[calc(50%-10px)] shrink-0 rounded-xl sm:w-[260px]" />
            ))
          : products.map((p) => (
              <div key={p.node.id} className="w-[calc(50%-10px)] shrink-0 snap-start sm:w-[260px]">
                <ProductCard product={p} />
              </div>
            ))}
      </div>
    </section>
  );
}
