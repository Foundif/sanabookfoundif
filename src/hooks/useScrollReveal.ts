import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Attaches a subtle GSAP fade/slide-up stagger to the direct children of the
 * returned ref, playing once each batch of cards scrolls into view. Used to
 * bring book cards (rails, grids) in with a bit of premium motion instead of
 * popping in instantly.
 *
 * Pass a deps array (e.g. [items.length, view]) so the animation re-plays
 * when the underlying set of cards changes (new filter, new sort, etc).
 */
export function useScrollReveal<T extends HTMLElement>(
  deps: unknown[] = [],
  externalRef?: RefObject<T | null>,
) {
  const internalRef = useRef<T | null>(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    const el = ref.current;
    if (!el || el.children.length === 0) return;

    // Respect reduced-motion preferences — just show the content, no animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el.children, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.children,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.07,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
          },
        },
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
