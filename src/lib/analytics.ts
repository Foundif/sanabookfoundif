/** Lightweight event tracking + Meta Pixel loader.
 * Database logging is restricted to avoid high cloud query costs.
 * Meta Pixel only runs on the live domain so preview/editor visits never reach Meta.
 */

type Fbq = (...a: unknown[]) => void;
const w = () => window as unknown as { fbq?: Fbq };

const ALLOWED_DOMAINS = ["sanabooks.in", "www.sanabooks.in"];

function isLiveDomain() {
  return typeof window !== "undefined" && ALLOWED_DOMAINS.includes(window.location.hostname);
}

export function track(_event: string, _label?: string | null, _meta: Record<string, unknown> = {}) {
  // Database writes disabled to reduce cloud usage.
}

/** Captures WhatsApp / Contact clicks for Meta Pixel without hitting the database. */
export function installClickTracking() {
  const handler = (e: MouseEvent) => {
    const el = (e.target as HTMLElement | null)?.closest("a,button,[data-track]") as HTMLElement | null;
    if (!el) return;
    const label = (el.dataset["track"] || el.getAttribute("aria-label") || el.textContent || "").trim();
    const href = el.getAttribute("href") || "";
    if (/wa\.me|whatsapp/i.test(href) || /whatsapp/i.test(label)) pixelTrack("Contact");
  };
  document.addEventListener("click", handler, { capture: true });
  return () => document.removeEventListener("click", handler, { capture: true });
}

let pixelLoaded = false;
export function loadMetaPixel(pixelId: string) {
  if (pixelLoaded || !pixelId || !isLiveDomain()) return;
  pixelLoaded = true;
  /* eslint-disable */
  // @ts-ignore
  !(function (f, b, e, v, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window as any, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  w().fbq?.("init", pixelId);
  w().fbq?.("track", "PageView");
}

export function pixelTrack(event: string, params?: Record<string, unknown>) {
  if (!isLiveDomain()) return;
  w().fbq?.("track", event, params);
}
