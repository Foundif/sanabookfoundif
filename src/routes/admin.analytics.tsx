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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">What visitors view and tap on your store.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.d}
              onClick={() => setDays(r.d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${days === r.d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi icon={Eye} label="Page views" value={stats.views} />
            <Kpi icon={Users} label="Visitors" value={stats.visitors} />
            <Kpi icon={MousePointerClick} label="Clicks" value={stats.clicks} />
            <Kpi icon={MessageCircle} label="WhatsApp taps" value={stats.whatsapp} />
            <Kpi icon={ShoppingCart} label="Add to cart" value={stats.cart} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TopList title="Top pages" rows={stats.topPages} />
            <TopList title="Most tapped buttons & links" rows={stats.topClicks} />
          </div>
          <section className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="flex items-center gap-2 font-bold"><Activity className="h-4 w-4" /> Live activity</h2>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                <option value="all">All events</option>
                {Object.entries(NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr><th className="p-2">When</th><th className="p-2">Event</th><th className="p-2">Detail</th><th className="p-2">Page</th></tr>
                </thead>
                <tbody>
                  {shown.slice(0, 300).map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="whitespace-nowrap p-2 text-muted-foreground">{new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="p-2 font-semibold">{NAMES[e.event_name] ?? e.event_name}</td>
                      <td className="max-w-[260px] truncate p-2">{e.label}</td>
                      <td className="p-2 text-muted-foreground">{e.path}</td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No activity yet.</td></tr>}
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
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString("en-IN")}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TopList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-bold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map(([k, v]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between gap-2"><span className="truncate">{k}</span><span className="font-semibold">{v}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">No data yet.</li>}
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
      return data as unknown as { id: string; meta_pixel_id: string | null; meta_pixel_enabled: boolean | null; order_notify_email: string | null } | null;
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
    if (p && !/^\d{8,20}$/.test(p.trim())) { toast.error("Pixel ID should be numbers only."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ meta_pixel_id: p.trim() || null, meta_pixel_enabled: en, order_notify_email: em.trim() || null } as never)
      .eq("id", data.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved", { description: "Changes apply on the live store after refresh." });
    void qc.invalidateQueries({ queryKey: ["pixel-settings"] });
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-bold">Integrations</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pixel">Meta (Facebook) Pixel ID</Label>
            <div className="flex items-center gap-2 text-xs"><span>{en && p ? "Connected" : "Off"}</span><Switch checked={en} onCheckedChange={setEnabled} /></div>
          </div>
          <Input id="pixel" value={p} onChange={(e) => setPixel(e.target.value)} placeholder="e.g. 2371989856885975" />
          <p className="text-xs text-muted-foreground">Paste your Pixel ID from Meta Events Manager. Tracks page views, WhatsApp taps and purchases.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="notify">Order notification email</Label>
          <Input id="notify" type="email" value={em} onChange={(e) => setEmail(e.target.value)} placeholder="stationeriessana@gmail.com" />
          <p className="text-xs text-muted-foreground">Gets an email for every paid order. Customers get their own confirmation.</p>
        </div>
      </div>
      <Button className="mt-4 rounded-full" onClick={() => void save()} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save integrations
      </Button>
    </section>
  );
}
