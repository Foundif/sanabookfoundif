import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";

const SLIDES = [
  {
    src: hero1,
    alt: "A mother and her daughter reading a picture book together on a floor cushion",
    caption: "First words, first favourites",
    note: "Board books & picture books for 0–5",
  },
  {
    src: hero2,
    alt: "Two school children reading in a library aisle lined with colourful books",
    caption: "Readers who can't put it down",
    note: "Early readers & chapter books for 6–10",
  },
  {
    src: hero3,
    alt: "A stack of children's books tied with a ribbon in a cosy window reading nook",
    caption: "Gift-ready bundles",
    note: "Up to 25% off curated sets",
  },
  {
    src: hero4,
    alt: "A grandmother reading aloud to a toddler beside a parcel of books",
    caption: "Delivered pan-India",
    note: "Free shipping over ₹499 · COD available",
  },
];

/** Auto-playing hero image carousel with dots, arrows and progress. */
export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/12 via-saffron/12 to-transparent blur-xl" />

      <div
        className="relative aspect-4/3 w-full overflow-hidden rounded-[1.75rem] border border-border/60 bg-surface shadow-lift"
        aria-roledescription="carousel"
        aria-label="Sanabooks India highlights"
      >
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            width={1200}
            height={900}
            loading={i === 0 ? "eager" : "lazy"}
            aria-hidden={i !== index}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
              i === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
            }`}
          />
        ))}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 via-navy/35 to-transparent p-5 pt-16 text-navy-foreground">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase opacity-80">
            {SLIDES[index]!.note}
          </p>
          <p className="mt-1 text-lg font-bold sm:text-xl">{SLIDES[index]!.caption}</p>
        </div>

        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous image"
          className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/85 text-foreground shadow-shelf transition-transform hover:scale-105"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next image"
          className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/85 text-foreground shadow-shelf transition-transform hover:scale-105"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.caption}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show ${slide.caption}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-9 bg-primary" : "w-4 bg-primary/25 hover:bg-primary/40"
            }`}
          />
        ))}
      </div>

      <div className="absolute -top-4 -right-3 hidden rounded-2xl border border-border/60 bg-surface px-4 py-3 shadow-lift sm:block">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
          Parent rated
        </p>
        <p className="mt-0.5 text-sm font-bold">4.8 / 5 · 2,100 reviews</p>
      </div>
    </div>
  );
}
