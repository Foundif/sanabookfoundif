import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShopifyProduct } from "@/lib/shopify";
import { productRating } from "@/lib/shopify";

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`flex items-center gap-0.5 ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            value >= i - 0.25 ? "fill-saffron text-saffron" : "text-border"
          }`}
        />
      ))}
    </span>
  );
}

export function ProductReviews({ product }: { product: ShopifyProduct }) {
  const rating = productRating(product);

  return (
    <section className="mt-16 rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Reviews &amp; ratings</p>
          <h2 className="mt-2 text-2xl font-bold">What parents say</h2>
        </div>
        <Button variant="outline" className="rounded-full border-primary text-primary" asChild>
          <a
            href={`mailto:hello@sanabooks.in?subject=${encodeURIComponent(
              `Review: ${product.node.title}`,
            )}`}
          >
            Write a review
          </a>
        </Button>
      </div>

      {rating ? (
        <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="rounded-xl bg-secondary p-6 text-center">
            <p className="text-4xl font-bold">{rating.average.toFixed(1)}</p>
            <Stars value={rating.average} className="mt-2 justify-center" />
            <p className="mt-2 text-xs text-muted-foreground">
              {rating.count} verified {rating.count === 1 ? "review" : "reviews"}
            </p>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This rating is pulled live from verified customer reviews in our Shopify store. Only
              buyers who received the book can leave a rating, so the score moves slowly and
              honestly.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li>· Verified purchase required</li>
              <li>· No incentives or paid reviews</li>
              <li>· Ratings shown out of 5, aggregated across languages and formats</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <Stars value={0} className="justify-center" />
          <p className="mt-3 text-sm font-semibold">No reviews yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Verified reviews from customers who bought this book will appear here automatically. We
            never publish reviews from anyone who has not received the book.
          </p>
        </div>
      )}
    </section>
  );
}
