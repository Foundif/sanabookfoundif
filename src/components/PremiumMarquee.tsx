import { Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  "Hand-picked by educators",
  "50,000+ happy families",
  "Pan-India delivery",
  "Curated gift bundles",
  "GST invoicing for schools",
  "Easy 7-day returns",
];

/**
 * A bold, high-contrast scrolling strip used as a brand statement on the
 * homepage — bigger and heavier than the header notice, for a premium,
 * boutique-storefront feel.
 */
export function PremiumMarquee() {
  return (
    <div className="group relative overflow-hidden border-y-2 border-saffron bg-navy py-3.5 text-navy-foreground sm:py-4">
      <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((dup) => (
          <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center">
            {HIGHLIGHTS.map((text, i) => (
              <span key={i} className="flex shrink-0 items-center gap-3 px-6 sm:gap-4 sm:px-8">
                <Sparkles className="h-4 w-4 shrink-0 text-saffron sm:h-5 sm:w-5" />
                <span className="text-sm font-bold tracking-[0.08em] whitespace-nowrap uppercase sm:text-lg">
                  {text}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
