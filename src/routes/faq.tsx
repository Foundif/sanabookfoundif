import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — Shipping, COD, Returns | Sanabooks India" },
      {
        name: "description",
        content:
          "Answers on India shipping and delivery dates, cash on delivery, UPI, GST invoices for schools, returns and gift wrap at Sanabooks India.",
      },
      { property: "og:title", content: "Help & FAQ | Sanabooks India" },
      {
        property: "og:description",
        content: "Shipping, COD, UPI, GST invoicing, returns and gifting — answered.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Faq,
});

const GROUPS = [
  {
    title: "Shipping & delivery",
    items: [
      {
        q: "How long does delivery take?",
        a: "Metro pincodes usually receive orders in 2–4 working days, Tier-2 cities in 3–5, and remote pincodes in 5–8. Orders placed before 4pm IST are dispatched the same working day. Enter your pincode on any product page for an exact date range.",
      },
      {
        q: "When is shipping free?",
        a: "Shipping is free on every order above ₹499. Below that, standard shipping is charged at checkout and shown before you pay.",
      },
      {
        q: "Do you ship everywhere in India?",
        a: "Yes — we deliver to all serviceable pincodes across India through our courier partners, including North-East and island pincodes.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "UPI, all major credit and debit cards, net banking, wallets, and cash on delivery. COD carries a ₹29 handling fee.",
      },
      {
        q: "Are prices inclusive of taxes?",
        a: "Yes. Every ₹ price on the site is inclusive of all applicable taxes. Your invoice shows the tax break-up.",
      },
      {
        q: "Can I get a GST invoice?",
        a: "Yes. Add your GSTIN at checkout, or write to us for school, library and corporate orders and we will raise a GST-compliant invoice.",
      },
    ],
  },
  {
    title: "Returns & gifting",
    items: [
      {
        q: "What is your return policy?",
        a: "Return any book within 7 days of delivery if it arrives damaged or is not what you expected. We arrange free pickup on damaged deliveries.",
      },
      {
        q: "Do you gift wrap?",
        a: "Yes. Choose gift wrap at checkout and add a hand-written note. Curated bundles always ship in a kraft gift box, free.",
      },
      {
        q: "Can I choose a delivery date for a gift?",
        a: "Tell us the occasion date in the order notes and we will time dispatch so the parcel lands a day or two ahead.",
      },
    ],
  },
  {
    title: "Choosing books",
    items: [
      {
        q: "How do you decide the age band?",
        a: "Every title is read and banded by our children's librarians and reviewed by practising teachers. Product pages show the recommended years and reading milestones.",
      },
      {
        q: "Do you stock Hindi and regional-language books?",
        a: "Yes — our Hindi & Regional Library shelf grows every week, including bilingual editions for English-first homes.",
      },
    ],
  },
];

function Faq() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <span className="text-foreground">Help &amp; FAQ</span>
      </nav>

      <header className="mt-4">
        <p className="eyebrow">Help centre</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Everything parents ask us</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Shipping dates, COD, GST invoices, returns and gifting — answered plainly. If something is
          missing, write to us and a human replies within one working day.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-lg font-bold">{group.title}</h2>
            <Accordion type="single" collapsible className="mt-3">
              {group.items.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left text-sm font-semibold">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-shelf sm:p-8">
        <p className="eyebrow">Still stuck?</p>
        <h2 className="mt-2 text-2xl font-bold">Talk to a real person</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Mail, label: "hello@sanabooks.in", note: "Replies in 1 working day", href: "mailto:hello@sanabooks.in" },
            { icon: Phone, label: "+91 80 4718 2200", note: "Mon–Sat, 10am–6pm IST", href: "tel:+918047182200" },
            { icon: MessageCircle, label: "WhatsApp us", note: "Order updates & advice", href: "https://wa.me/918047182200" },
          ].map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="rounded-xl border border-border p-4 transition-colors hover:border-primary"
            >
              <c.icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-bold">{c.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
            </a>
          ))}
        </div>
        <Button className="mt-6 rounded-full" asChild>
          <Link to="/schools">Bulk & school enquiries</Link>
        </Button>
      </section>
    </div>
  );
}
