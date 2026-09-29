import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, ShoppingBag, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/shopify";
import { pixelTrack, track } from "@/lib/analytics";

const searchSchema = z.object({
  order: z.string().optional().default(""),
  total: z.coerce.number().optional().default(0),
});

export const Route = createFileRoute("/thank-you")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Thank you for your order — Sana's Books India" },
      { name: "description", content: "Your Sana's Books order has been confirmed." },
      { property: "og:title", content: "Thank you for your order — Sana's Books India" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const { order, total } = Route.useSearch();

  useEffect(() => {
    if (!order) return;

    // Deduplication guard: ensure purchase event only fires once per order session
    const trackedKey = `sb_tracked_purchase_${order}`;
    if (!sessionStorage.getItem(trackedKey)) {
      pixelTrack("Purchase", {
        value: total,
        currency: "INR",
        content_name: `Order ${order}`,
      });
      track("purchase", order, { total });
      sessionStorage.setItem(trackedKey, "true");
    }
  }, [order, total]);

  const whatsappMessage = encodeURIComponent(
    `Hi Sana's Books team, I just placed order ${order ? `#${order}` : ""}. Could you confirm my tracking details?`
  );

  return (
    <div className="min-h-[70vh] bg-background px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-leaf/10 text-leaf">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <p className="eyebrow mt-6">Order Placed Successfully</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Thank you for your order!
        </h1>

        {order ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Order Reference</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-foreground">{order}</p>
            {total > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Total Paid: <span className="font-semibold text-foreground">{formatINR(total)}</span>
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              A confirmation email has been sent to your email address. To track your order, send this order ID to us on WhatsApp or use the Track Order page.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            Your books are being carefully prepared for dispatch.
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/shop">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/track" search={{ order: order || undefined }}>Track Order</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <a
              href={`https://wa.me/919150113923?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4 text-leaf" />
              WhatsApp Updates
            </a>
          </Button>
        </div>

        <div className="mt-6">
          <Button asChild variant="ghost" className="text-sm text-muted-foreground">
            <Link to="/account">
              View your account &amp; orders <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
