import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import ageBanner from "@/assets/age-banner.jpg";
import { Button } from "@/components/ui/button";
import { ProductRail } from "@/components/ProductRail";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AGE_GROUPS, CATEGORIES, fetchProducts } from "@/lib/shopify";

export const Route = createFileRoute("/age/$tag")({
  head: ({ params }) => {
    const group = AGE_GROUPS.find((a) => a.tag === params.tag);
    const label = group?.label ?? "Every age";
    return {
      meta: [
        { title: `Books for ${label} | Sanabooks India` },
        {
          name: "description",
          content: `Hand-picked books for ${label}. ${group?.note ?? "Curated by parents, teachers and children's librarians."} ₹ pricing, COD and free shipping over ₹499.`,
        },
        { property: "og:title", content: `Books for ${label} | Sanabooks India` },
        {
          property: "og:description",
          content: `A shelf built for ${label} — age-checked by educators and delivered across India.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: AgeLanding,
});

const READING_MILESTONES: Record<string, string[]> = {
  "age-0-2": ["Points at pictures", "Repeats sounds", "Turns board pages"],
  "age-3-5": ["Follows a story", "Recognises letters", "Asks 'why' questions"],
  "age-6-8": ["Reads short chapters aloud", "Retells a plot", "Sounds out new words"],
  "age-9-12": ["Reads independently", "Prefers series", "Discusses characters"],
  adults: ["Reads for twenty quiet minutes", "Keeps a to-read pile", "Shares favourites"],
};

function AgeLanding() {
  const { tag } = Route.useParams();
  const group = AGE_GROUPS.find((a) => a.tag === tag) ?? AGE_GROUPS[1]!;

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "age", group.tag],
    queryFn: () => fetchProducts(60),
  });

  const inAge = (products ?? []).filter((p) => p.node.tags.includes(group.tag));
  const bestsellers = inAge.filter((p) => p.node.tags.includes("bestseller"));
  const shelf = (bestsellers.length >= 3 ? bestsellers : inAge).slice(0, 10);
  const fresh = [...inAge].reverse().slice(0, 8);
  const types = Array.from(new Set(inAge.map((p) => p.node.productType).filter(Boolean)));
  const milestones = READING_MILESTONES[group.tag] ?? [];

  return (
    <div>
      {/* Header */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <nav className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            /{" "}
            <Link to="/shop" className="hover:text-primary">
              Shop
            </Link>{" "}
            / <span className="text-foreground">{group.label}</span>
          </nav>

          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="eyebrow">Shop by age</p>
              <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
                Books for the {group.label.replace(" years", "")} years
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                {group.note}. Every title is age-checked by educators, so the book you order matches
                the child you have.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" className="rounded-full px-7" asChild>
                  <Link to="/shop" search={{ age: group.tag }}>
                    Browse all {inAge.length || ""} titles
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary px-7 text-primary"
                  asChild
                >
                  <Link to="/shop" search={{ age: group.tag, category: "Bundles" }}>
                    Age bundles
                  </Link>
                </Button>
              </div>

              {milestones.length > 0 && (
                <ul className="mt-8 grid gap-2 sm:grid-cols-3">
                  {milestones.map((m) => (
                    <li
                      key={m}
                      className="rounded-lg border border-border bg-card p-3 text-xs font-semibold shadow-shelf"
                    >
                      <BookOpen className="mb-2 h-3.5 w-3.5 text-primary" />
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <img
              src={ageBanner}
              alt={`Children in the ${group.label} age group reading together`}
              width={1400}
              height={700}
              className="aspect-2/1 w-full rounded-2xl object-cover shadow-lift"
            />
          </div>

          {/* Age switcher */}
          <div className="mt-10 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {AGE_GROUPS.map((a) => (
              <Link
                key={a.tag}
                to="/age/$tag"
                params={{ tag: a.tag }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  a.tag === group.tag
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary hover:text-primary"
                }`}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Curated categories for this age */}
      {types.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <p className="eyebrow">Curated for this age</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Start with a format</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {types.slice(0, 8).map((t) => {
              const count = inAge.filter((p) => p.node.productType === t).length;
              return (
                <Link
                  key={t}
                  to="/shop"
                  search={{ age: group.tag, category: t }}
                  className="group rounded-xl border border-border bg-card p-5 shadow-shelf transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <Sparkles className="h-5 w-5 text-saffron" />
                  <h3 className="mt-4 text-base font-bold group-hover:text-primary">{t}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {count} {count === 1 ? "title" : "titles"}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Browse{" "}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Bestsellers rail */}
      <section className="bg-surface py-14">
        <div className="mx-auto max-w-7xl px-4">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          ) : shelf.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <p className="text-sm font-semibold">No products found.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We are still stocking this shelf. Browse the whole library meanwhile.
              </p>
              <Button variant="outline" className="mt-5 rounded-full" asChild>
                <Link to="/shop">Shop the library</Link>
              </Button>
            </div>
          ) : (
            <ProductRail
              products={shelf}
              eyebrow={`Bestsellers for ${group.label}`}
              title="What families buy most"
              action={
                <Button variant="ghost" className="text-primary" asChild>
                  <Link to="/shop" search={{ age: group.tag }}>
                    See all
                  </Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* New this month */}
      {fresh.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <p className="eyebrow">New this month</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Fresh on the {group.label} shelf</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {fresh.slice(0, 4).map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Gift note */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-2xl bg-navy px-6 py-10 text-navy-foreground sm:px-12">
          <div className="grid items-center gap-6 sm:flex sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">
                Gifting for {group.label}
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Not sure which title? Send a bundle.
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-85">
                Age-matched sets ship in a kraft gift box with a hand-written note — free, and up to
                25% off single-book prices.
              </p>
            </div>
            <Button size="lg" variant="secondary" className="shrink-0 rounded-full px-7" asChild>
              <Link to="/shop" search={{ category: "Bundles" }}>
                Shop bundles
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
