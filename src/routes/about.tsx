import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Globe2, HeartHandshake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Sanabooks India — Our Story & Curation" },
      {
        name: "description",
        content:
          "Sanabooks began in Singapore and now ships pan-India. Meet the parents, teachers and librarians who hand-pick every title on our shelves.",
      },
      { property: "og:title", content: "About Sanabooks India — Our Story & Curation" },
      {
        property: "og:description",
        content:
          "How we curate children's books, why age-fit matters, and what Sanabooks India promises every family.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    icon: BookOpen,
    title: "Age-fit before hype",
    body: "Every title is read cover to cover and tagged to a narrow age band, so you are never guessing in the aisle.",
  },
  {
    icon: Globe2,
    title: "Made for Indian homes",
    body: "INR pricing inclusive of taxes, COD and UPI at checkout, GST invoices, and a growing Hindi & regional shelf.",
  },
  {
    icon: HeartHandshake,
    title: "Parent-first service",
    body: "Seven-day returns, sturdy packaging built for monsoon transit, and a real person answering your questions.",
  },
  {
    icon: Sparkles,
    title: "Curation, not catalogue",
    body: "We stock a few hundred titles we believe in rather than everything in print. Fewer choices, better evenings.",
  },
];

const TIMELINE = [
  ["2016", "Sanabooks opens as a small curated bookshop in Singapore."],
  ["2019", "Shop-by-age curation becomes the heart of how families browse."],
  ["2023", "Schools and libraries programme launches with bulk curation support."],
  ["2026", "Sanabooks India begins shipping pan-India from our Mumbai warehouse."],
];

function About() {
  return (
    <div>
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
          <p className="eyebrow">Our story</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            A bookshop run by people who read to children
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Sanabooks started in Singapore with a simple frustration: buying children's books online
            meant scrolling endless listings with no idea what suited a four-year-old versus a
            nine-year-old. We fixed it by reading everything we sell and organising the shop the way
            parents actually think — by age, by mood, by the length of the evening.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Sanabooks India brings that same shelf to Indian families, with rupee pricing, COD and
            UPI, GST invoicing for schools, and packaging that survives a monsoon delivery.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full px-7" asChild>
              <Link to="/shop">Browse the library</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary px-7 text-primary"
              asChild
            >
              <Link to="/schools">For schools &amp; libraries</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <p className="eyebrow">What we stand for</p>
        <h2 className="mt-2 text-3xl font-bold">Four promises on every order</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-xl border border-border bg-card p-6 shadow-shelf">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto max-w-3xl px-4">
          <p className="eyebrow">Milestones</p>
          <h2 className="mt-2 text-3xl font-bold">From one shelf to two countries</h2>
          <ol className="mt-8 space-y-6 border-l border-border pl-6">
            {TIMELINE.map(([year, body]) => (
              <li key={year} className="relative">
                <span className="absolute top-1.5 -left-[1.9rem] h-3 w-3 rounded-full bg-primary" />
                <p className="text-sm font-bold text-primary">{year}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
