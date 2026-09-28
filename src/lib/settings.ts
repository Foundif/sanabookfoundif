/** Store-wide settings: maintenance mode, header notices, and shipping configuration. */
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_NOTICES = [
  "Free India Shipping on Orders Over ₹499",
  "100% Genuine Activity & Learning Books",
  "Dispatched within 24 Hours from Chennai",
  "COD & Instant UPI Available Across India",
];

export interface SiteSettings {
  id: string;
  maintenance_enabled: boolean;
  maintenance_heading: string;
  maintenance_message: string;
  maintenance_ends_at: string | null;
  show_countdown: boolean;
  header_notices?: string[] | null;
  header_notice_enabled?: boolean;
  free_shipping_threshold?: number;
  standard_shipping_charge?: number;
  express_shipping_charge?: number;
}

const FALLBACK_SETTINGS: SiteSettings = {
  id: "81d51d36-0522-4eb1-bf24-f552d7c916f5",
  maintenance_enabled: false,
  maintenance_heading: "We are getting the shelves ready",
  maintenance_message: "Sanabooks India is briefly offline for a quick update.",
  maintenance_ends_at: null,
  show_countdown: true,
  header_notices: DEFAULT_NOTICES,
  header_notice_enabled: true,
  free_shipping_threshold: 499,
  standard_shipping_charge: 49,
  express_shipping_charge: 99,
};

let cachedSettings: SiteSettings | null = null;
let lastFetchTime = 0;

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const now = Date.now();
  if (cachedSettings && now - lastFetchTime < 60_000) {
    return cachedSettings;
  }

  // Fetch all columns
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();

  if (!error && data) {
    const s = data as any;
    cachedSettings = {
      id: s.id,
      maintenance_enabled: !!s.maintenance_enabled,
      maintenance_heading: s.maintenance_heading || FALLBACK_SETTINGS.maintenance_heading,
      maintenance_message: s.maintenance_message || FALLBACK_SETTINGS.maintenance_message,
      maintenance_ends_at: s.maintenance_ends_at || null,
      show_countdown: s.show_countdown ?? true,
      header_notices: Array.isArray(s.header_notices) ? s.header_notices : DEFAULT_NOTICES,
      header_notice_enabled: s.header_notice_enabled ?? true,
      free_shipping_threshold: Number(s.free_shipping_threshold ?? 499),
      standard_shipping_charge: Number(s.standard_shipping_charge ?? 49),
      express_shipping_charge: Number(s.express_shipping_charge ?? 99),
    };
    lastFetchTime = now;
    return cachedSettings;
  }

  return FALLBACK_SETTINGS;
}

export async function saveSiteSettings(id: string, patch: Partial<Omit<SiteSettings, "id">>) {
  const { error } = await supabase
    .from("site_settings")
    .update(patch as any)
    .eq("id", id);
  if (error) throw error;
  cachedSettings = null; // Invalidate cache immediately
}

export function maintenanceActive(settings: SiteSettings, now = new Date()): boolean {
  if (!settings.maintenance_enabled) return false;
  if (!settings.maintenance_ends_at) return true;
  return new Date(settings.maintenance_ends_at).getTime() > now.getTime();
}

export function countdownParts(targetIso: string, now = new Date()) {
  const ms = Math.max(0, new Date(targetIso).getTime() - now.getTime());
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { ms, days, hours, minutes, seconds };
}
