import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { ARTICLES } from "@/lib/articles";

export const Route = createFileRoute("/reading-room")({
  head: () => ({
    meta: [
      { title: "The Reading Room — Guides for Curious Parents" },
      {
        name: "description",
        content:
          "Practical reading guides from Sanabooks India: bedtime routines, what to read at each age, and raising bilingual readers in an English-first home.",
      },
      { property: "og:title", content: "The Reading Room — Guides for Curious Parents" },
      {
        property: "og:description",
        content:
          "Bedtime rituals, age-by-age reading guides and bilingual reading advice from our children's librarians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReadingRoom,
});


function ReadingRoom() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <p className="eyebrow">Reading Room</p>
      <h1 className="mt-2 text-4xl font-bold sm:text-5xl">For curious parents</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Short, practical notes from our children's librarians — on habits, age-fit and building a
        home library that gets used.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {ARTICLES.map((a) => (
          <article
            key={a.title}
            className="group overflow-hidden rounded-xl border border-border bg-card shadow-shelf transition-shadow hover:shadow-lift"
          >
            <div className={`flex h-40 items-end p-5 ${a.tone}`}>
              <span className="rounded-full bg-surface/90 px-3 py-1 text-[11px] font-bold text-foreground">
                {a.tag}
              </span>
            </div>
            <div className="p-6">
              <h2 className="text-lg font-bold group-hover:text-primary">{a.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {a.minutes} min read
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-cream px-6 py-10 sm:px-12">
        <h2 className="text-2xl font-bold">Not sure where to start?</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Pick your child's age and we will show the shelf we would hand you in the shop.
        </p>
        <Link
          to="/shop"
          search={{ age: "age-3-5" }}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          Shop by age <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
