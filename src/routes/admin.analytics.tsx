import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  BookOpen,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/lib/shopify";
import { fetchSiteSettings, saveSiteSettings } from "@/lib/settings";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Store Analytics — Sanabooks Admin" },
      { name: "description", content: "Key sales metrics and Meta Pixel configuration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const qc = useQueryClient();

  // Load orders to compute real store metrics
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, subtotal, payment_status, status, created_at, order_items(product_title, quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: fetchSiteSettings,
  });

  const [pixelId, setPixelId] = useState("");
  const [pixelEnabled, setPixelEnabled] = useState(true);
  const [synced, setSynced] = useState(false);

  if (settings && !synced) {
    setPixelId(settings.meta_pixel_id || "2371989856885975");
    setPixelEnabled(settings.meta_pixel_enabled ?? true);
    setSynced(true);
  }

  const savePixel = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({
        meta_pixel_id: pixelId.trim(),
        meta_pixel_enabled: pixelEnabled,
      });
    },
    onSuccess: () => {
      toast.success("Meta Pixel settings updated");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    },
    onError: () => toast.error("Could not save Meta Pixel settings"),
  });

  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.payment_status === "paid" || o.status === "delivered");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgOrderValue = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0;

    // Top books count
    const bookMap = new Map<string, number>();
    orders.forEach((o: any) => {
      (o.order_items || []).forEach((item: any) => {
        const title = item.product_title || "Unknown Book";
        bookMap.set(title, (bookMap.get(title) || 0) + (item.quantity || 1));
      });
    });
    const topBooks = [...bookMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      revenue: totalRevenue,
      totalOrders: orders.length,
      paidCount: paidOrders.length,
      aov: avgOrderValue,
      topBooks,
    };
  }, [orders]);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Store Performance &amp; Analytics</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Real revenue, order volume, and direct Meta Pixel tracking.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 4 E-Commerce KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                <IndianRupee className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatINR(stats.revenue)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">From {stats.paidCount} paid orders</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
                <ShoppingBag className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.paidCount} paid / {stats.totalOrders - stats.paidCount} pending
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Order Value</span>
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatINR(stats.aov)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Per completed checkout</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Pixel Tracking</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-foreground">{pixelEnabled ? "Active" : "Paused"}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Free Meta event sync</p>
            </div>
          </div>

          {/* Top Selling Books */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold">
              <BookOpen className="h-4 w-4 text-primary" /> Top Selling Books
            </h2>
            <div className="mt-3 divide-y divide-border">
              {stats.topBooks.map(([title, qty], i) => (
                <div key={title} className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
                  <span className="truncate pr-4 font-medium">
                    <span className="text-muted-foreground mr-2 font-bold">#{i + 1}</span> {title}
                  </span>
                  <span className="font-bold text-primary shrink-0">{qty} sold</span>
                </div>
              ))}
              {stats.topBooks.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No book sales recorded yet.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Meta Pixel Integration Card */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold">Meta Pixel &amp; Ad Tracking</h2>
            <p className="text-xs text-muted-foreground">
              Runs client-side for zero database costs. Tracks PageView, AddToCart, WhatsApp, and Purchases.
            </p>
          </div>
          <a
            href="https://adsmanager.facebook.com/events_manager"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
          >
            Open Events Manager <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="pixel-id" className="text-xs font-semibold">
              Meta Pixel ID
            </Label>
            <Input
              id="pixel-id"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="e.g. 2371989856885975"
              className="text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={pixelEnabled} onCheckedChange={setPixelEnabled} id="pixel-toggle" />
              <Label htmlFor="pixel-toggle" className="text-xs cursor-pointer font-medium">
                {pixelEnabled ? "Tracking enabled" : "Tracking disabled"}
              </Label>
            </div>
            <Button
              size="sm"
              onClick={() => savePixel.mutate()}
              disabled={savePixel.isPending}
              className="gap-1.5 text-xs font-bold ml-auto"
            >
              {savePixel.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Pixel
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
