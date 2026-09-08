import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Gift,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/HeroCarousel";
import { PremiumMarquee } from "@/components/PremiumMarquee";
import { PromoCarousel } from "@/components/PromoCarousel";
import { FeaturedCollections } from "@/components/FeaturedCollections";
import { ProductRail } from "@/components/ProductRail";
import { AGE_GROUPS, formatINR } from "@/lib/shopify";
import { fetchProducts } from "@/lib/catalog";
import { ARTICLES } from "@/lib/articles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanabooks India — Books That Grow With Your Child" },
      {
        name: "description",
        content:
          "A children's library hand-picked by parents, teachers and librarians. Shop by age, curated bundles, ₹ pricing with COD and UPI, free shipping over ₹499.",
      },
      { property: "og:title", content: "Sanabooks India — Books That Grow With Your Child" },
      {
        property: "og:description",
        content:
          "Hand-picked children's books for Indian families. Shop by age, bundles up to 25% off, COD and UPI at checkout.",
      },
    ],
  }),
  component: Home,
});

const TRUST = [
  { icon: Truck, title: "Free shipping over ₹499", note: "Delivered in 3–5 days" },
  { icon: ShieldCheck, title: "Hand-picked, age-checked", note: "Reviewed by educators" },
  { icon: RotateCcw, title: "Easy 7-day returns", note: "No questions asked" },
  { icon: Gift, title: "Gift wrap available", note: "Add a hand-written note" },
];

function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "home"],
    queryFn: () => fetchProducts(24),
  });

  const bestsellers = (products ?? []).filter((p) => p.node.tags.includes("bestseller"));
  const shelf = (bestsellers.length >= 4 ? bestsellers : (products ?? [])).slice(0, 8);
  const bundles = (products ?? []).filter((p) => p.node.tags.includes("bundle")).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-saffron/20 px-3 py-1 text-xs font-bold text-saffron-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-saffron" /> Now shipping across India
            </span>
            <h1 className="mt-6 text-5xl font-bold sm:text-6xl lg:text-7xl">Books that grow</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              A library hand-picked by parents, teachers and children's librarians. From first words
              to first novels — and a quiet shelf for grown-ups too.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full px-7" asChild>
                <Link to="/shop">Shop the library</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-primary px-7 text-primary"
                asChild
              >
                <Link to="/shop" search={{ age: "age-3-5" }}>
                  Find books by age
                </Link>
              </Button>
            </div>
            <dl className="mt-10 flex gap-10">
              {[
                ["2,400+", "Curated titles"],
                ["50,000", "Happy families"],
                ["Pan-India", "Delivery"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-xl font-bold">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroCarousel />
        </div>

        {/* Trust strip */}
        <div className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <t.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{t.title}</span>
                  <span className="block text-xs text-muted-foreground">{t.note}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PremiumMarquee />

      {/* Rotating promotions */}
      <div className="pt-12">
        <PromoCarousel />
      </div>

      {/* Shop by age */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Shop by age</p>
            <h2 className="mt-2 text-3xl font-bold">The right book, the right year</h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex"
          >
            All books <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {AGE_GROUPS.map((age) => (
            <Link
              key={age.tag}
              to="/age/$tag"
              params={{ tag: age.tag }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-shelf transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift"
            >
              <span className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-accent transition-transform duration-500 group-hover:scale-125" />
              <BookOpen className="relative h-5 w-5 text-primary" />
              <h3 className="relative mt-4 text-base font-bold">{age.label}</h3>
              <p className="relative mt-1 text-xs text-muted-foreground">{age.note}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Browse{" "}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4">
          <ProductRail
            products={shelf}
            isLoading={isLoading}
            eyebrow="Bestsellers"
            title="What Indian families are reading"
            action={
              <Link
                to="/shop"
                className="mr-1 hidden items-center gap-1 text-sm font-semibold text-primary sm:flex"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      </section>

      {/* Bundles */}
      {bundles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <p className="eyebrow">Curated bundles</p>
          <h2 className="mt-2 text-3xl font-bold">Multi-book value, one gift box</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Save up to 25% on hand-picked sets. Every bundle ships in a kraft gift box with a
            hand-written note — free.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {bundles.map((b) => {
              const variant = b.node.variants.edges[0]?.node;
              const image = b.node.images.edges[0]?.node;
              return (
                <Link
                  key={b.node.id}
                  to="/product/$handle"
                  params={{ handle: b.node.handle }}
                  className="group flex gap-4 rounded-xl border border-border bg-card p-4 shadow-shelf transition-shadow hover:shadow-lift"
                >
                  {image && (
                    <img
                      src={image.url}
                      alt={image.altText ?? b.node.title}
                      loading="lazy"
                      className="h-28 w-24 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <span className="min-w-0">
                    <span className="eyebrow">Bundle</span>
                    <span className="mt-1 block line-clamp-2 text-sm font-bold group-hover:text-primary">
                      {b.node.title}
                    </span>
                    <span className="mt-2 block text-base font-bold">
                      {formatINR(variant?.price.amount ?? b.node.priceRange.minVariantPrice.amount)}
                    </span>
                    <span className="mt-1 block text-xs text-leaf">Gift box included</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured collections tied to Shopify products */}
      <FeaturedCollections />

      {/* Testimonials */}
      <section className="bg-cream py-16">
        <div className="mx-auto max-w-7xl px-4">
          <p className="eyebrow">Loved by parents</p>
          <h2 className="mt-2 text-3xl font-bold">Why families keep coming back</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Age-fit, every time",
                body: "Each title carries a clear age band checked by educators, so the book you order actually matches the child you have.",
                image: ARTICLES[1]!.image,
                alt: "A young child reading beside a stack of picture books",
              },
              {
                title: "Built for India",
                body: "₹ pricing inclusive of taxes, COD and UPI at checkout, GST invoicing for schools, and pincode-accurate delivery dates.",
                image: ARTICLES[2]!.image,
                alt: "Two children reading bilingual Hindi and English books",
              },
              {
                title: "Bundles that make gifting easy",
                body: "Curated sets ship in a kraft gift box with a hand-written note — free, and up to 25% off the single-book price.",
                image: ARTICLES[3]!.image,
                alt: "A kraft gift box of books with a hand-written note",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-shelf transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <img
                  src={c.image}
                  alt={c.alt}
                  loading="lazy"
                  width={800}
                  height={600}
                  className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-6">
                  <h3 className="text-base font-bold">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Customer reviews appear on each product page once verified buyers submit them.
          </p>
        </div>
      </section>

      {/* Reading Room */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Reading Room</p>
            <h2 className="mt-2 text-3xl font-bold">Guides for curious parents</h2>
          </div>
          <Link
            to="/reading-room"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary sm:flex"
          >
            All articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {ARTICLES.slice(0, 3).map((a) => (
            <Link
              key={a.title}
              to="/reading-room"
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-shelf transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="relative block overflow-hidden">
                <img
                  src={a.image}
                  alt={a.title}
                  loading="lazy"
                  width={800}
                  height={600}
                  className="aspect-16/9 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 rounded-full bg-surface/95 px-2.5 py-1 text-[10px] font-bold text-primary">
                  {a.tag}
                </span>
              </span>
              <span className="block p-5">
                <span className="block text-sm font-bold group-hover:text-primary">{a.title}</span>
                <span className="mt-2 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {a.excerpt}
                </span>
                <span className="mt-3 block text-xs font-semibold text-primary">
                  {a.minutes} min read →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Schools banner */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="rounded-2xl bg-navy px-6 py-10 text-navy-foreground sm:px-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">
                For schools, libraries &amp; corporates
              </p>
              <h2 className="mt-3 text-3xl font-bold">Stocking a library? We can help.</h2>
              <p className="mt-3 text-sm leading-relaxed opacity-85">
                Bulk pricing from 25 books, GST-compliant invoicing, free PAN-India delivery over
                ₹15,000, and a children's librarian to help curate.
              </p>
            </div>
            <Button size="lg" variant="secondary" className="rounded-full px-7" asChild>
              <Link to="/schools">
                <GraduationCap className="mr-2 h-4 w-4" /> Request a quote
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
