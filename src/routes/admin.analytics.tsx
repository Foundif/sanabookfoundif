import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Eye, Loader2, MessageCircle, MousePointerClick, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Sanabooks admin" },
      { name: "description", content: "Visitor page views, clicks and WhatsApp enquiries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

interface Ev {
  id: string;
  event_name: string;
  label: string | null;
  path: string | null;
  session_id: string | null;
  created_at: string;
}

const RANGES = [
  { d: 1, l: "Today" },
  { d: 7, l: "7 days" },
  { d: 30, l: "30 days" },
];

const NAMES: Record<string, string> = {
  page_view: "Page view",
  button_click: "Button click",
  link_click: "Link click",
  whatsapp_click: "WhatsApp",
  add_to_cart: "Add to cart",
  checkout_click: "Checkout",
};

function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState("all");
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events" as never)
        .select("id, event_name, label, path, session_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as Ev[];
    },
  });

  const stats = useMemo(() => {
    const count = (n: string) => events.filter((e) => e.event_name === n).length;
    const top = (key: "path" | "label", pred: (e: Ev) => boolean) => {
      const m = new Map<string, number>();
      events.filter(pred).forEach((e) => {
        const k = e[key] || "—";
        m.set(k, (m.get(k) ?? 0) + 1);
      });
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    };
    return {
      views: count("page_view"),
      visitors: new Set(events.map((e) => e.session_id).filter(Boolean)).size,
      clicks: events.filter((e) => e.event_name !== "page_view").length,
      whatsapp: count("whatsapp_click"),
      cart: count("add_to_cart"),
      topPages: top("path", (e) => e.event_name === "page_view"),
      topClicks: top("label", (e) => e.event_name !== "page_view"),
    };
  }, [events]);

  const shown = filter === "all" ? events : events.filter((e) => e.event_name === filter);

  return (
    <div className="w-full min-w-0 space-y-5 overflow-hidden">
      {/* Header & Date Range */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">What visitors view and tap on your store.</p>
        </div>
        <div className="flex w-fit gap-1 rounded-full border border-border p-1 bg-card">
          {RANGES.map((r) => (
            <button
              key={r.d}
              onClick={() => setDays(r.d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                days === r.d
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI grid: 2-column on mobile, 5-column on desktop */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5 min-w-0">
            <Kpi icon={Eye} label="Page views" value={stats.views} />
            <Kpi icon={Users} label="Visitors" value={stats.visitors} />
            <Kpi icon={MousePointerClick} label="Clicks" value={stats.clicks} />
            <Kpi icon={MessageCircle} label="WhatsApp taps" value={stats.whatsapp} />
            <div className="col-span-2 md:col-span-1">
              <Kpi icon={ShoppingCart} label="Add to cart" value={stats.cart} />
            </div>
          </div>

          {/* Top Lists with strict text truncation & min-w-0 */}
          <div className="grid gap-4 lg:grid-cols-2 min-w-0">
            <TopList title="Top pages" rows={stats.topPages} />
            <TopList title="Most tapped buttons & links" rows={stats.topClicks} />
          </div>

          {/* Live Activity Table */}
          <section className="min-w-0 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
              <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold">
                <Activity className="h-4 w-4 text-primary" /> Live activity
              </h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs sm:text-sm font-medium"
              >
                <option value="all">All events</option>
                {Object.entries(NAMES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[520px] text-xs sm:text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2.5">When</th>
                    <th className="p-2.5">Event</th>
                    <th className="p-2.5">Detail</th>
                    <th className="p-2.5">Page</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, 300).map((e) => (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="whitespace-nowrap p-2.5 text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-2.5 font-semibold text-foreground whitespace-nowrap">
                        {NAMES[e.event_name] ?? e.event_name}
                      </td>
                      <td className="max-w-[200px] truncate p-2.5" title={e.label ?? ""}>
                        {e.label ?? "—"}
                      </td>
                      <td className="max-w-[140px] truncate p-2.5 text-muted-foreground" title={e.path ?? ""}>
                        {e.path ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <PixelCard />
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
      <p className="mt-1.5 text-lg sm:text-2xl font-bold tracking-tight">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function TopList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <h2 className="text-sm sm:text-base font-bold truncate">{title}</h2>
      <ul className="mt-3 space-y-3">
        {rows.map(([k, v]) => (
          <li key={k} className="min-w-0 text-sm">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-medium text-foreground" title={k}>
                {k}
              </span>
              <span className="shrink-0 text-xs sm:text-sm font-semibold text-muted-foreground">
                {v.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(4, Math.min(100, (v / max) * 100))}%` }}
              />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs sm:text-sm text-muted-foreground py-2">No data yet.</li>}
      </ul>
    </section>
  );
}

function PixelCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["pixel-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      return data as unknown as {
        id: string;
        meta_pixel_id: string | null;
        meta_pixel_enabled: boolean | null;
        order_notify_email: string | null;
      } | null;
    },
  });
  const [pixel, setPixel] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  if (!data) return null;
  const p = pixel ?? data.meta_pixel_id ?? "";
  const en = enabled ?? data.meta_pixel_enabled !== false;
  const em = email ?? data.order_notify_email ?? "";

  const save = async () => {
    if (p && !/^\d{8,20}$/.test(p.trim())) {
      toast.error("Pixel ID should be numbers only.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        meta_pixel_id: p.trim() || null,
        meta_pixel_enabled: en,
        order_notify_email: em.trim() || null,
      } as never)
      .eq("id", data.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved", { description: "Changes apply on the live store after refresh." });
    void qc.invalidateQueries({ queryKey: ["pixel-settings"] });
  };

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm sm:text-base font-bold">Integrations</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <Label htmlFor="pixel" className="text-xs sm:text-sm">
              Meta (Facebook) Pixel ID
            </Label>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{en && p ? "Connected" : "Off"}</span>
              <Switch checked={en} onCheckedChange={setEnabled} />
            </div>
          </div>
          <Input id="pixel" value={p} onChange={(e) => setPixel(e.target.value)} placeholder="e.g. 2371989856885975" />
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Paste your Pixel ID from Meta Events Manager. Tracks page views, WhatsApp taps and purchases.
          </p>
        </div>
        <div className="grid gap-1.5 min-w-0">
          <Label htmlFor="notify" className="text-xs sm:text-sm">
            Order notification email
          </Label>
          <Input
            id="notify"
            type="email"
            value={em}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="stationeriessana@gmail.com"
          />
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Gets an email for every paid order. Customers get their own confirmation.
          </p>
        </div>
      </div>
      <Button className="mt-4 rounded-full text-xs sm:text-sm" onClick={() => void save()} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save integrations
      </Button>
    </section>
  );
}
