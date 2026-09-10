import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Check, Copy, Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const WHATSAPP_NUMBER = "919444166630";
const WHATSAPP_MESSAGE = "Hi Sanabooks India! I'd like to know more about your children's books.";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const OFFER_CODE = "WELCOME15";

/** Site-wide floating chrome: a right-edge "Offers" tab with a popup modal, and a WhatsApp chat bubble. */
export function FloatingWidgets() {
  const [offerOpen, setOfferOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isProductPage = useRouterState({
    select: (s) => s.location.pathname.startsWith("/product/"),
  });

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(OFFER_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the code is still visible to copy by hand.
    }
  };

  return (
    <>
      {/* Right-edge offers tab */}
      <button
        type="button"
        onClick={() => setOfferOpen(true)}
        aria-label="View current offers"
        className="fixed top-1/2 right-0 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl bg-primary px-2.5 py-4 text-primary-foreground shadow-lift transition-transform hover:-translate-x-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Gift className="h-5 w-5" />
        <span
          className="text-[11px] font-bold tracking-[0.18em] uppercase"
          style={{ writingMode: "vertical-rl" }}
        >
          Offers
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron text-[10px] font-bold text-saffron-foreground">
          %
        </span>
      </button>

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent
          hideClose
          className="max-w-sm overflow-hidden rounded-2xl border-none p-0 sm:rounded-2xl"
        >
          <div className="relative bg-navy px-6 pt-8 pb-14 text-center text-navy-foreground">
            <DialogClose className="absolute top-3 right-3 rounded-full bg-navy-foreground/10 p-1.5 opacity-90 transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-saffron text-saffron-foreground">
              <Gift className="h-6 w-6" />
            </span>
            <DialogTitle className="mt-4 text-2xl font-bold text-navy-foreground">
              A little gift for you
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-[26ch] text-sm text-navy-foreground/80">
              Take 15% off your first order of hand-picked children's books.
            </DialogDescription>
          </div>

          <div className="relative -mt-8 px-6 pb-6">
            <button
              type="button"
              onClick={copyCode}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-primary/40 bg-surface px-4 py-3 shadow-lift transition-colors hover:bg-accent"
            >
              <span className="text-left">
                <span className="block text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Your code
                </span>
                <span className="block text-lg font-bold tracking-[0.1em] text-primary">
                  {OFFER_CODE}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy
                  </>
                )}
              </span>
            </button>

            <Button size="lg" className="mt-4 w-full rounded-full" asChild>
              <Link to="/shop" onClick={() => setOfferOpen(false)}>
                Shop now
              </Link>
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Applies automatically at checkout · Valid on orders above ₹499
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp chat bubble — lifted above the mobile bottom nav, and further
          still on product pages where a sticky "Add to cart" bar also sits at
          the bottom, so it never covers either. */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className={`fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:scale-105 ${
          isProductPage ? "bottom-44" : "bottom-28"
        } lg:bottom-6`}
      >
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/60 motion-reduce:animate-none" />
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.28.62 4.4 1.72 6.23L4 29l7.94-1.68a11.9 11.9 0 0 0 4.08.72h.01c6.62 0 12.02-5.4 12.02-12.02C28.05 8.4 22.65 3 16.02 3Zm0 21.86h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-4.19.89.9-4.09-.24-.42a9.84 9.84 0 0 1-1.51-5.25c0-5.46 4.45-9.9 9.94-9.9 2.65 0 5.14 1.03 7.02 2.9a9.87 9.87 0 0 1 2.9 7.01c0 5.46-4.45 9.45-9.41 9.45Zm5.44-7.39c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.91-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}
