/** Store-wide settings: maintenance mode and header announcement notices. */
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
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  // First attempt: fetch all columns including notices
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "id, maintenance_enabled, maintenance_heading, maintenance_message, maintenance_ends_at, show_countdown, header_notices, header_notice_enabled"
    )
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return data as unknown as SiteSettings;
  }

  // Second attempt fallback: fetch basic columns if custom columns don't exist yet
  const { data: basicData, error: basicError } = await supabase
    .from("site_settings")
    .select("id, maintenance_enabled, maintenance_heading, maintenance_message, maintenance_ends_at, show_countdown")
    .limit(1)
    .maybeSingle();

  if (!basicError && basicData) {
    return {
      ...(basicData as unknown as SiteSettings),
      header_notices: DEFAULT_NOTICES,
      header_notice_enabled: true,
    };
  }

  return FALLBACK_SETTINGS;
}

export async function saveSiteSettings(id: string, patch: Partial<Omit<SiteSettings, "id">>) {
  const { error } = await supabase.from("site_settings").update(patch as any).eq("id", id);
  if (error) throw error;
}

/** True while maintenance is on and the scheduled end time (if any) has not passed. */
export function maintenanceActive(s: SiteSettings | null | undefined, now = Date.now()) {
  if (!s?.maintenance_enabled) return false;
  if (s.maintenance_ends_at && new Date(s.maintenance_ends_at).getTime() <= now) return false;
  return true;
}

export function countdownParts(endsAt: string | null, now = Date.now()) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
