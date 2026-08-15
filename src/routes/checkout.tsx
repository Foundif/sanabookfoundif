import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Lock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShippingEstimator } from "@/components/ShippingEstimator";
import { formatINR } from "@/lib/shopify";
import type { ShippingMethodId } from "@/lib/shipping";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Secure checkout — Sanabooks India" },
      {
        name: "description",
        content:
          "Complete your Sanabooks India order: pincode-accurate delivery dates, cash on delivery, UPI and card payments, GST invoicing on request.",
      },
      { property: "og:title", content: "Secure checkout — Sanabooks India" },
      {
        property: "og:description",
        content: "COD, UPI and card payments with pincode-accurate delivery windows.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

const PAYMENTS = [
  { id: "upi", label: "UPI", note: "GPay · PhonePe · Paytm" },
  { id: "card", label: "Card", note: "Credit & debit" },
  { id: "cod", label: "Cash on delivery", note: "₹29 handling fee" },
] as const;

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [shipping, setShipping] = useState<{ method: ShippingMethodId; total: number } | null>(null);
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["id"]>("upi");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const shippingCost = shipping ? Math.max(0, shipping.total - subtotal) : 0;
  const codFee = payment === "cod" ? 29 : 0;
  const total = subtotal + shippingCost + codFee;

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const id = `SB${Date.now().toString().slice(-8)}`;
    window.setTimeout(() => {
      clearCart();
      setPlaced(id);
      setBusy(false);
      toast.success("Order placed", { description: `Order ${id} confirmed.` });
    }, 700);
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-leaf" />
        <h1 className="mt-6 text-3xl font-bold">Order confirmed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your order <span className="font-semibold text-foreground">{placed}</span> is booked. We
          have emailed the invoice and will share tracking as soon as the parcel leaves our Mumbai
          warehouse.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link to="/shop">Keep browsing</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/account">View your account</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-bold">Your basket is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a few books and your delivery estimate will appear here.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/shop">Browse the library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">Secure checkout</p>
      <h1 className="mt-2 text-3xl font-bold">Delivery &amp; payment</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <form className="grid gap-6" onSubmit={placeOrder}>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required autoComplete="name" placeholder="Ananya Sharma" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="email">Email (for invoice)</Label>
                <Input id="email" type="email" required autoComplete="email" placeholder="you@email.com" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" required placeholder="Flat, building, street, landmark" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" required placeholder="Mumbai" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" required placeholder="Maharashtra" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Delivery speed</h2>
            <div className="mt-3">
              <ShippingEstimator
                subtotal={subtotal}
                onSelect={(method, totalWithShipping) =>
                  setShipping({ method, total: totalWithShipping })
                }
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPayment(p.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    payment === p.id
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="block text-sm font-bold">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.note}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Prices include all taxes · GST invoice available on
              request
            </p>
          </section>

          <Button type="submit" size="lg" className="rounded-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Place order · {formatINR(total)}
          </Button>
        </form>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="text-base font-bold">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-3">
                {item.product.node.images?.edges?.[0]?.node && (
                  <img
                    src={item.product.node.images.edges[0].node.url}
                    alt={item.product.node.title}
                    className="h-16 w-12 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold">{item.product.node.title}</p>
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <span className="text-sm font-bold">
                  {formatINR(parseFloat(item.price.amount) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="font-semibold">
                {shipping ? (shippingCost === 0 ? "Free" : formatINR(shippingCost)) : "Add pincode"}
              </dd>
            </div>
            {codFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">COD handling</dt>
                <dd className="font-semibold">{formatINR(codFee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold">{formatINR(total)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => void navigate({ to: "/shop" })}
            className="mt-4 text-xs font-semibold text-primary"
          >
            Add more books
          </button>
        </aside>
      </div>
    </div>
  );
}
