import { MessageSquarePlus, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ShopifyProduct } from "@/lib/shopify";
import { productRating } from "@/lib/shopify";

export function Stars({
  value,
  className = "",
  size = "sm",
}: {
  value: number;
  className?: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className={`flex items-center gap-0.5 ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${dim} ${value >= i - 0.25 ? "fill-saffron text-saffron" : "text-border"}`}
        />
      ))}
    </span>
  );
}

export function ProductReviews({ product }: { product: ShopifyProduct }) {
  const rating = productRating(product);
  const reviewHref = `mailto:hello@sanabooks.in?subject=${encodeURIComponent(
    `Review: ${product.node.title}`,
  )}`;

  return (
    <section id="reviews" className="mt-16 rounded-2xl border border-border bg-card p-6 shadow-shelf sm:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Reviews &amp; ratings</p>
          <h2 className="mt-2 text-2xl font-bold">What parents say</h2>
        </div>
        <Button variant="outline" className="shrink-0 rounded-full border-primary text-primary" asChild>
          <a href={reviewHref}>
            <MessageSquarePlus className="mr-2 h-4 w-4" /> Write a review
          </a>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Score card */}
        <div className="rounded-xl bg-secondary p-6 text-center">
          <p className="text-5xl font-bold">{rating ? rating.average.toFixed(1) : "—"}</p>
          <Stars value={rating?.average ?? 0} size="lg" className="mt-3 justify-center" />
          <p className="mt-3 text-xs text-muted-foreground">
            {rating
              ? `${rating.count} verified ${rating.count === 1 ? "review" : "reviews"}`
              : "No verified reviews yet"}
          </p>
        </div>

        {/* Star breakdown — filled only from verified Shopify review data */}
        <div>
          <ul className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <li key={star} className="flex items-center gap-3">
                <span className="flex w-14 shrink-0 items-center gap-1 text-xs font-semibold">
                  {star} <Star className="h-3 w-3 fill-saffron text-saffron" />
                </span>
                <Progress value={0} className="h-2 flex-1" />
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                  {rating ? "—" : 0}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Verified purchase required", note: "Only real buyers can review" },
              { label: "No paid or incentivised reviews", note: "Ever" },
              { label: "Ratings out of 5", note: "Aggregated across formats" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border p-3">
                <ShieldCheck className="h-4 w-4 text-leaf" />
                <p className="mt-2 text-xs font-bold">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold">
          {rating ? "Written reviews are being collected" : "No reviews yet"}
        </p>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          Reviews from customers who bought this book appear here automatically once verified. We
          never publish reviews from anyone who has not received the book.
        </p>
        <Button variant="ghost" className="mt-4 text-primary" asChild>
          <a href={reviewHref}>Be the first to review this book</a>
        </Button>
      </div>
    </section>
  );
}
