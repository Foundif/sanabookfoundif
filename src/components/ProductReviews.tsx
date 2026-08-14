import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquarePlus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { deleteReview, fetchReviews, summarise, upsertReview } from "@/lib/reviews";
import type { ShopifyProduct } from "@/lib/shopify";

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

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            className={`h-7 w-7 transition-transform hover:scale-110 ${
              value >= i ? "fill-saffron text-saffron" : "text-border"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ product }: { product: ShopifyProduct }) {
  const handle = product.node.handle;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", handle],
    queryFn: () => fetchReviews(handle),
  });

  const list = reviews ?? [];
  const { count, average, buckets } = summarise(list);
  const mine = user ? list.find((r) => r.user_id === user.id) : undefined;

  useEffect(() => {
    if (open && mine) {
      setRating(mine.rating);
      setTitle(mine.title ?? "");
      setBody(mine.body ?? "");
    }
  }, [open, mine]);

  const save = useMutation({
    mutationFn: () =>
      upsertReview({
        userId: user!.id,
        handle,
        productTitle: product.node.title,
        rating,
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: async () => {
      toast.success(mine ? "Review updated" : "Thanks for your review");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["reviews", handle] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save review"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: async () => {
      toast.success("Review removed");
      await queryClient.invalidateQueries({ queryKey: ["reviews", handle] });
    },
  });

  return (
    <section
      id="reviews"
      className="mt-16 rounded-2xl border border-border bg-card p-6 shadow-shelf sm:p-8"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Reviews &amp; ratings</p>
          <h2 className="mt-2 text-2xl font-bold">What parents say</h2>
        </div>
        {user ? (
          <Button
            variant="outline"
            className="shrink-0 rounded-full border-primary text-primary"
            onClick={() => setOpen(true)}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" /> {mine ? "Edit your review" : "Write a review"}
          </Button>
        ) : (
          <Button variant="outline" className="shrink-0 rounded-full border-primary text-primary" asChild>
            <Link to="/auth">
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Sign in to review
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
        <div className="rounded-xl bg-secondary p-6 text-center">
          <p className="text-5xl font-bold">{count ? average.toFixed(1) : "—"}</p>
          <Stars value={average} size="lg" className="mt-3 justify-center" />
          <p className="mt-3 text-xs text-muted-foreground">
            {count ? `${count} ${count === 1 ? "review" : "reviews"}` : "No reviews yet"}
          </p>
        </div>

        <div>
          <ul className="space-y-2.5">
            {buckets.map(({ star, count: n }) => (
              <li key={star} className="flex items-center gap-3">
                <span className="flex w-14 shrink-0 items-center gap-1 text-xs font-semibold">
                  {star} <Star className="h-3 w-3 fill-saffron text-saffron" />
                </span>
                <Progress value={count ? (n / count) * 100 : 0} className="h-2 flex-1" />
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Account required", note: "Only signed-in readers can review" },
              { label: "No paid reviews", note: "Ever" },
              { label: "One review per book", note: "Editable any time" },
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

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">No reviews yet</p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
              Be the first to tell other parents how this book landed at home.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {list.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                      {r.author.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{r.author}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    {user?.id === r.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete your review"
                        onClick={() => remove.mutate(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {r.title && <p className="mt-3 text-sm font-semibold">{r.title}</p>}
                {r.body && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mine ? "Edit your review" : "Write a review"}</DialogTitle>
            <DialogDescription>{product.node.title}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label>Your rating</Label>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-title">Headline</Label>
              <Input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A bedtime favourite"
                maxLength={80}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-body">Your review</Label>
              <Textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="What did your child enjoy? Was the age band right?"
                maxLength={1200}
              />
            </div>
            <Button type="submit" className="rounded-full" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mine ? "Update review" : "Post review"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
