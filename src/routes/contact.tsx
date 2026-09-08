import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail, MapPin, Phone } from "lucide-react";
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
        content:
          "Order help, delivery questions, GST invoices and school enquiries — we reply within one working day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const TOPICS = [
  { id: "order", label: "Order question" },
  { id: "recommendation", label: "Book recommendation" },
  { id: "school", label: "School / bulk order" },
  { id: "invoice", label: "GST invoice" },
  { id: "returns", label: "Return or refund" },
  { id: "general", label: "Something else" },
] as const;

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    lines: ["hello@sanabooksindia.com"],
  },
  {
    icon: Phone,
    title: "WhatsApp",
    lines: ["+91 98765 43210 · Mon–Sat 10am–7pm"],
  },
  {
    icon: MapPin,
    title: "Office & warehouse",
    lines: ["26, 2nd Cross, Indiranagar, Bengaluru 560038"],
  },
];

function ContactPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const orderNumber = String(form.get("order") ?? "").trim();
    setBusy(true);
    try {
      await sendContactMessage({
        userId: user?.id ?? null,
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: "",
        topic: String(form.get("topic") ?? "general"),
        message:
          (orderNumber ? `Order ${orderNumber}\n\n` : "") + String(form.get("message") ?? ""),
      });
      setSent(true);
      toast.success("Message sent", { description: "We usually reply the same day." });
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          / <span className="text-foreground">Contact us</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="eyebrow">Talk to us</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              We read every message.
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Average response time: 4 hours, weekdays. Real humans, not bots.
            </p>

            <div className="mt-8 grid gap-3">
              {CHANNELS.map((c) => (
                <div
                  key={c.title}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary">
                    <c.icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{c.title}</p>
                    {c.lines.map((l) => (
                      <p key={l} className="mt-0.5 text-xs text-muted-foreground">
                        {l}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-shelf sm:p-8">
            {sent ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" />
                <h2 className="mt-4 text-2xl font-bold">Message received</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Our team will reply by email, usually the same day. For anything urgent about a
                  live order, WhatsApp us on the number listed here.
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
                  <h2 className="text-xl font-bold">Send us a message</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We'll reply on email, usually same day.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name" className="eyebrow">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={(user?.user_metadata?.["display_name"] as string) ?? ""}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="eyebrow">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      defaultValue={user?.email ?? ""}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="topic" className="eyebrow">
                    Topic
                  </Label>
                  <select
                    id="topic"
                    name="topic"
                    defaultValue="order"
                    className="rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    {TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="order" className="eyebrow">
                    Order number (if relevant)
                  </Label>
                  <Input id="order" name="order" placeholder="SB-XX-XXXXX" />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="message" className="eyebrow">
                    Message
                  </Label>
                  <Textarea id="message" name="message" required rows={6} />
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
        </div>
      </div>
    </div>
  );
}
