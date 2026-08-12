import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROMO_BANNERS, TONE_CLASS } from "@/lib/promotions";

export function PromoCarousel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PROMO_BANNERS.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [playing]);

  const banner = PROMO_BANNERS[index]!;

  return (
    <section aria-label="Promotions" className="mx-auto max-w-7xl px-4">
      <div
        className={`relative overflow-hidden rounded-2xl px-6 py-10 sm:px-12 ${TONE_CLASS[banner.tone]}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase opacity-75">
              {banner.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold">{banner.title}</h2>
            <p className="mt-3 text-sm leading-relaxed opacity-90">{banner.body}</p>
            <span className="mt-4 inline-block rounded-full bg-surface/20 px-3 py-1 text-[11px] font-bold">
              {banner.badge}
            </span>
          </div>
          <Button size="lg" variant="secondary" className="rounded-full px-7" asChild>
            <Link to="/shop" search={banner.search as never}>
              {banner.ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-3">
          {PROMO_BANNERS.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`Show promotion: ${b.title}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8 bg-current opacity-100" : "w-4 bg-current opacity-40"
              }`}
            />
          ))}
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause promotions" : "Play promotions"}
            className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/20"
          >
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </section>
  );
}
