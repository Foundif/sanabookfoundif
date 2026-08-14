import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Package, Star, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyReviews } from "@/lib/reviews";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — Sanabooks India" },
      {
        name: "description",
        content:
          "Manage your Sanabooks India account: your reviews, delivery preferences and order help.",
      },
      { property: "og:title", content: "Your account — Sanabooks India" },
      { property: "og:description", content: "Your Sanabooks India reading account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: () => fetchMyReviews(user!.id),
    enabled: !!user,
  });

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-2 text-3xl font-bold">
            {(user.user_metadata?.["display_name"] as string) ?? user.email}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Package, title: "Orders", note: "Order updates are emailed to you", to: "/faq" as const },
          { icon: Truck, title: "Delivery", note: "Check delivery by pincode", to: "/shop" as const },
          { icon: Star, title: "Reviews", note: "Reviews you have written", to: "/reading-room" as const },
        ].map((c) => (
          <Link
            key={c.title}
            to={c.to}
            className="rounded-xl border border-border bg-card p-5 shadow-shelf transition-shadow hover:shadow-lift"
          >
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-bold">{c.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Your reviews</h2>
        {isLoading ? (
          <Skeleton className="mt-4 h-24 rounded-xl" />
        ) : (reviews ?? []).length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You have not reviewed a book yet. Open any book page and share what your child thought.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {(reviews ?? []).map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to="/product/$handle"
                    params={{ handle: r.product_handle }}
                    className="text-sm font-bold hover:text-primary"
                  >
                    {r.product_title ?? r.product_handle}
                  </Link>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    {r.rating} <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />
                  </span>
                </div>
                {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
