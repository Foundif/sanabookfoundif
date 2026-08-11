import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      { title: "Bulk Books for Schools & Libraries | Sanabooks India" },
      {
        name: "description",
        content:
          "Bulk children's book orders from 25 copies with GST invoicing, free PAN-India delivery over ₹15,000 and curation help from our librarians.",
      },
      { property: "og:title", content: "Bulk Books for Schools & Libraries | Sanabooks India" },
      {
        property: "og:description",
        content: "Institutional pricing, GST invoices and curated reading lists for Indian schools.",
      },
    ],
  }),
  component: Schools,
});

function Schools() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="eyebrow">For institutions</p>
      <h1 className="mt-2 text-4xl font-bold">Schools, libraries &amp; corporate gifting</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        We supply reading corners, classroom sets and staff gifting programmes across India. Bulk
        pricing starts at 25 copies, every order ships with a GST-compliant invoice, and delivery is
        free PAN-India above ₹15,000.
      </p>

      <ul className="mt-8 space-y-3 text-sm">
        {[
          "Tiered discounts from 25, 100 and 500 copies",
          "GST invoicing and purchase-order billing",
          "Curated grade-wise reading lists from our librarians",
          "Dedicated account manager and 30-day credit terms",
        ].map((item) => (
          <li key={item} className="flex gap-3 rounded-lg border border-border bg-card p-4">
            <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-xl bg-navy p-8 text-navy-foreground">
        <h2 className="text-xl font-bold">Request a quote</h2>
        <p className="mt-2 text-sm opacity-85">
          Email <span className="font-semibold">schools@sanabooks.in</span> with your grade levels
          and approximate quantity, and we'll send a curated list with institutional pricing within
          two working days.
        </p>
        <Button variant="secondary" className="mt-6 rounded-full" asChild>
          <Link to="/shop">Browse the library first</Link>
        </Button>
      </div>
    </div>
  );
}
