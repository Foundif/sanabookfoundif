import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgePercent, CheckCircle2, Loader2, Lock, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShippingEstimator } from "@/components/ShippingEstimator";
import { formatINR } from "@/lib/shopify";
import type { ShippingMethodId } from "@/lib/shipping";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { createOrder, validateCoupon, type CouponResult } from "@/lib/orders";
import { createRazorpayOrder, confirmRazorpayPayment } from "@/lib/payments.functions";

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
  { id: "online", label: "UPI / Card / Netbanking", note: "Secured by Razorpay" },
  { id: "cod", label: "Cash on delivery", note: "₹29 handling fee" },
] as const;

type PaymentId = (typeof PAYMENTS)[number]["id"];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    notes: "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const [shipping, setShipping] = useState<{
    method: ShippingMethodId;
    total: number;
    pincode: string;
  } | null>(null);
  const [payment, setPayment] = useState<PaymentId>("online");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const [codeText, setCodeText] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [coupon, setCoupon] = useState<CouponResult | null>(null);

  const subtotal = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const rawShipping = shipping ? Math.max(0, shipping.total - subtotal) : 0;
  const discount = coupon?.ok ? Math.min(coupon.discount ?? 0, subtotal) : 0;
  const shippingCost = coupon?.ok && coupon.free_shipping ? 0 : rawShipping;
  const codFee = payment === "cod" ? 29 : 0;
  const total = Math.max(0, subtotal - discount + shippingCost + codFee);

  const applyCoupon = async () => {
    if (!codeText.trim()) return;
    setCheckingCode(true);
    const result = await validateCoupon(codeText, subtotal);
    setCheckingCode(false);
    if (result.ok) {
      setCoupon(result);
      toast.success(`${result.code} applied`, { description: `You saved ${formatINR(result.discount ?? 0)}.` });
    } else {
      setCoupon(null);
      toast.error(result.reason ?? "This code is not valid.");
    }
  };

  const orderPayload = (orderPaymentStatus: string) => ({
    userId: user?.id ?? null,
    email: form.email,
    fullName: form.name,
    phone: form.phone,
    address: form.address,
    city: form.city,
    state: form.state,
    pincode: shipping?.pincode ?? null,
    shippingMethod: shipping?.method ?? "standard",
    paymentMethod: payment,
    subtotal,
    shippingFee: shippingCost,
    codFee,
    discount,
    couponCode: coupon?.ok ? (coupon.code ?? null) : null,
    total,
    notes: form.notes || null,
    paymentStatus: orderPaymentStatus,
    items: items.map((i) => ({
      product_handle: i.product.node.handle,
      product_title: i.product.node.title,
      image_url: i.product.node.images?.edges?.[0]?.node?.url ?? null,
      unit_price: parseFloat(i.price.amount),
      quantity: i.quantity,
    })),
  });

  const finish = (orderNumber: string) => {
    clearCart();
    setPlaced(orderNumber);
    setBusy(false);
    toast.success("Order placed", { description: `Order ${orderNumber} confirmed.` });
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping) {
      toast.error("Add your pincode to pick a delivery speed.");
      return;
    }
    setBusy(true);

    try {
      if (payment === "cod") {
        const orderNumber = await createOrder(orderPayload("cod_pending"));
        finish(orderNumber);
        return;
      }

      const ready = await loadRazorpayScript();
      if (!ready) throw new Error("Could not reach the payment window. Check your connection.");

      const orderNumber = await createOrder(orderPayload("pending"));
      const rp = await createRazorpayOrder({ data: { amount: total, receipt: orderNumber } });

      const checkout = new window.Razorpay!({
        key: rp.keyId,
        amount: rp.amount,
        currency: "INR",
        name: "Sana's Books India",
        description: `Order ${orderNumber}`,
        order_id: rp.razorpayOrderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { order_number: orderNumber },
        theme: { color: "#1b2a4a" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            toast.error("Payment cancelled", {
              description: `Order ${orderNumber} is saved as unpaid. You can pay on delivery instead.`,
            });
          },
        },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          void (async () => {
            const result = await confirmRazorpayPayment({
              data: {
                orderNumber,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            });
            if (!result.ok) {
              setBusy(false);
              toast.error(result.reason ?? "Payment could not be verified.");
              return;
            }
            finish(orderNumber);
          })();
        },
      });
      checkout.open();
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Could not place the order.");
    }
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-leaf" />
        <h1 className="mt-6 text-3xl font-bold">Order confirmed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your order <span className="font-semibold text-foreground">{placed}</span> is booked. We
          will share tracking as soon as the parcel leaves our warehouse.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link to="/shop">Keep browsing</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/account">View your orders</Link>
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
                <Input id="name" required autoComplete="name" placeholder="Ananya Sharma" value={form.name} onChange={set("name")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="email">Email (for invoice)</Label>
                <Input id="email" type="email" required autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set("email")} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" required placeholder="Flat, building, street, landmark" value={form.address} onChange={set("address")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" required placeholder="Mumbai" value={form.city} onChange={set("city")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" required placeholder="Maharashtra" value={form.state} onChange={set("state")} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="notes">Delivery notes (optional)</Label>
                <Input id="notes" placeholder="Leave with the security desk" value={form.notes} onChange={set("notes")} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Delivery speed</h2>
            <div className="mt-3">
              <ShippingEstimator
                subtotal={subtotal}
                onSelect={(method, totalWithShipping, pincode) =>
                  setShipping({ method, total: totalWithShipping, pincode: pincode ?? "" })
                }
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            {payment === "cod" ? "Place order" : "Pay securely"} · {formatINR(total)}
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

          <div className="mt-5 border-t border-border pt-4">
            {coupon?.ok ? (
              <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <BadgePercent className="h-4 w-4 text-leaf" />
                  {coupon.code} applied
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    setCodeText("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove discount code"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={codeText}
                  onChange={(e) => setCodeText(e.target.value.toUpperCase())}
                  placeholder="Discount code"
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 rounded-lg"
                  onClick={() => void applyCoupon()}
                  disabled={checkingCode || !codeText.trim()}
                >
                  {checkingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatINR(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-leaf">
                <dt>Discount {coupon?.code ? `(${coupon.code})` : ""}</dt>
                <dd className="font-semibold">−{formatINR(discount)}</dd>
              </div>
            )}
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
