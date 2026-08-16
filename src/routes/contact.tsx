import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Loader2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { sendContactMessage } from "@/lib/orders";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Sanabooks India — Orders, Schools & Support" },
      {
        name: "description",
        content:
          "Talk to the Sanabooks India team about an order, a delivery, GST invoicing, school and bulk requirements, or a book recommendation for your child.",
      },
      { property: "og:title", content: "Contact Sanabooks India" },
      {
        property: "og:description",
        content: "Order help, delivery questions, GST invoices and school enquiries — we reply within one working day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const TOPICS = [
  { id: "order", label: "Order or delivery" },
  { id: "recommendation", label: "Book recommendation" },
  { id: "school", label: "School / bulk order" },
  { id: "invoice", label: "GST invoice" },
  { id: "general", label: "Something else" },
] as const;

function ContactPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState<string>("order");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await sendContactMessage({
        userId: user?.id ?? null,
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        topic,
        message: String(form.get("message") ?? ""),
      });
      setSent(true);
      toast.success("Message sent", { description: "We reply within one working day." });
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <p className="eyebrow">Contact us</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold sm:text-5xl">
          A real person reads every message
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Order updates, delivery windows, GST invoices, or help choosing the right book for a
          six-year-old who says they hate reading — ask us anything.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-shelf">
            {sent ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" />
                <h2 className="mt-4 text-2xl font-bold">Message received</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Our team in Mumbai will reply within one working day. For anything urgent about a
                  live order, call us on the number listed here.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild className="rounded-full">
                    <Link to="/shop">Keep browsing books</Link>
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setSent(false)}>
                    Send another message
                  </Button>
                </div>
              </div>
            ) : (
              <form className="grid gap-5" onSubmit={submit}>
                <div>
                  <Label className="text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground">
                    What is it about?
                  </Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopic(t.id)}
                        className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                          topic === t.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={(user?.user_metadata?.["display_name"] as string) ?? ""}
                      placeholder="Ananya Sharma"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" name="phone" inputMode="tel" placeholder="98XXXXXXXX" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email ?? ""}
                    placeholder="you@email.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Tell us the order number, pincode or your child's age…"
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send message
                </Button>
                <p className="text-xs text-muted-foreground">
                  We use your details only to answer this enquiry.
                </p>
              </form>
            )}
          </div>

          <aside className="grid gap-4">
            {[
              {
                icon: Mail,
                title: "Email",
                lines: ["hello@sanabooks.in", "Replies within 1 working day"],
              },
              {
                icon: Phone,
                title: "Phone & WhatsApp",
                lines: ["+91 90000 00000", "Mon–Sat, 10am–6pm IST"],
              },
              {
                icon: MessageCircle,
                title: "Schools & bulk",
                lines: ["schools@sanabooks.in", "Quotes, GST invoices, PO billing"],
              },
              {
                icon: MapPin,
                title: "Warehouse",
                lines: ["Andheri East, Mumbai 400069", "Dispatch cut-off 4pm IST"],
              },
              {
                icon: Clock,
                title: "Order support",
                lines: ["Track from your account", "7-day easy returns"],
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-5">
                <c.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-bold">{c.title}</p>
                {c.lines.map((l) => (
                  <p key={l} className="mt-0.5 text-xs text-muted-foreground">
                    {l}
                  </p>
                ))}
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
