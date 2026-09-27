/** Lightweight first-party event tracking + Meta Pixel loader. */
import { supabase } from "@/integrations/supabase/client";

type Fbq = (...a: unknown[]) => void;
const w = () => window as unknown as { fbq?: Fbq };

function sessionId() {
  try {
    let id = sessionStorage.getItem("sb_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("sb_sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(event: string, label?: string | null, meta: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return;
  void supabase.auth.getSession().then(({ data }) =>
    supabase.from("analytics_events" as never).insert({
      event_name: event.slice(0, 60),
      label: label ? label.slice(0, 200) : null,
      path: path.slice(0, 300),
      session_id: sessionId(),
      user_id: data.session?.user.id ?? null,
      meta,
    } as never),
  );
}

/** Captures clicks on buttons/links site-wide. Returns a cleanup function. */
export function installClickTracking() {
  const handler = (e: MouseEvent) => {
    const el = (e.target as HTMLElement | null)?.closest("a,button,[data-track]") as HTMLElement | null;
    if (!el) return;
    const label = (el.dataset.track || el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
    const href = el.getAttribute("href") || "";
    let name = el.tagName === "A" ? "link_click" : "button_click";
    if (/wa\.me|whatsapp/i.test(href) || /whatsapp/i.test(label)) name = "whatsapp_click";
    else if (/add to cart/i.test(label)) name = "add_to_cart";
    else if (/buy now|checkout|pay securely/i.test(label)) name = "checkout_click";
    track(name, label || href, href ? { href } : {});
    if (name === "whatsapp_click") w().fbq?.("track", "Contact");
  };
  document.addEventListener("click", handler, { capture: true });
  return () => document.removeEventListener("click", handler, { capture: true });
}

let pixelLoaded = false;
export function loadMetaPixel(pixelId: string) {
  if (pixelLoaded || !pixelId || typeof window === "undefined") return;
  pixelLoaded = true;
  /* eslint-disable */
  // @ts-ignore
  !(function (f, b, e, v, n?: any, t?: any, s?: any) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); })(window as any, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  w().fbq?.("init", pixelId);
  w().fbq?.("track", "PageView");
}

export function pixelTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined") w().fbq?.("track", event, params);
}
