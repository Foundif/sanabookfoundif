import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact-info";

type Tracked = {
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  total: number;
  city: string;
  courier_name: string | null;
  tracking_number: string | null;
  items: { title: string; variant: string | null; qty: number; image: string | null }[];
};

const STEPS = ["placed", "packed", "shipped", "delivered"] as const;

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>) => ({ order: typeof s["order"] === "string" ? (s["order"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Track Your Order | Sana's Books India" },
      { name: "description", content: "Check the live status of your Sana's Books India order with your order ID and phone number." },
      { property: "og:title", content: "Track Your Order | Sana's Books India" },
      { property: "og:description", content: "Enter your order ID and phone number to see where your books are." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const search = Route.useSearch();
  const [orderNo, setOrderNo] = useState(search.order ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Tracked | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error } = await supabase.rpc("track_order" as never, { _order_number: orderNo, _phone: phone } as never);
    setLoading(false);
    if (error) return setError("Could not check right now. Please try again.");
    if (!data) return setError("No order found. Check the order ID and the phone number used at checkout.");
    setResult(data as unknown as Tracked);
  };

  const cancelled = result?.status === "cancelled";
  const stepIdx = result ? STEPS.indexOf(result.status as (typeof STEPS)[number]) : -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-3xl font-bold">Track your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your order ID (from your email) and the phone number you used.</p>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="ord">Order ID</Label>
          <Input id="ord" required value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="SB12345678" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ph">Phone number</Label>
          <Input id="ph" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className="mt-1" />
        </div>
        <Button type="submit" className="sm:col-span-2" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Track order
        </Button>
      </form>

      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-lg font-bold">#{result.order_number}</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{result.status}</span>
          </div>
          {cancelled ? (
            <p className="text-sm text-destructive">This order was cancelled. WhatsApp us if you have questions.</p>
          ) : (
            <ol className="grid grid-cols-4 gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-col items-center gap-1 text-center">
                  {i <= stepIdx ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                  <span className={`text-xs capitalize ${i <= stepIdx ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
                </li>
              ))}
            </ol>
          )}
          {(result.courier_name || result.tracking_number) && (
            <p className="rounded-lg bg-secondary p-3 text-sm">
              Courier: <strong>{result.courier_name ?? "—"}</strong> · Tracking no: <strong className="break-all">{result.tracking_number ?? "—"}</strong>
            </p>
          )}
          <ul className="divide-y divide-border">
            {result.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                {it.image && <img src={it.image} alt="" className="h-12 w-10 shrink-0 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-semibold">{it.title}</p>
                  {it.variant && <p className="text-xs text-muted-foreground">{it.variant}</p>}
                </div>
                <span className="shrink-0 text-xs">× {it.qty}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Placed {new Date(result.created_at).toLocaleDateString("en-IN")}</span>
            <span className="font-bold">{formatINR(Number(result.total))}</span>
          </div>
          <Button asChild variant="outline" className="w-full">
            <a href={whatsappLink(`Hi, I'd like an update on order #${result.order_number}`)} target="_blank" rel="noopener noreferrer">
              Ask on WhatsApp
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
