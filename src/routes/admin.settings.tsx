import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { countdownParts, fetchSiteSettings, saveSiteSettings } from "@/lib/settings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Store settings — Sanabooks India admin" },
      { name: "description", content: "Maintenance mode and store-wide settings." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Store settings — Sanabooks India admin" },
      { property: "og:description", content: "Maintenance mode and store-wide settings." },
    ],
  }),
  component: AdminSettings,
});

/** Converts an ISO timestamp to the value a datetime-local input expects (local time). */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PRESETS = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "Tomorrow", minutes: 60 * 24 },
];

function AdminSettings() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: fetchSiteSettings,
  });

  const [enabled, setEnabled] = useState(false);
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [showCountdown, setShowCountdown] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!data) return;
    setEnabled(data.maintenance_enabled);
    setHeading(data.maintenance_heading);
    setMessage(data.maintenance_message);
    setEndsAt(toLocalInput(data.maintenance_ends_at));
    setShowCountdown(data.show_countdown);
  }, [data]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const save = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await saveSiteSettings(data.id, {
        maintenance_enabled: enabled,
        maintenance_heading: heading.trim() || "We are getting the shelves ready",
        maintenance_message: message.trim(),
        maintenance_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        show_countdown: showCountdown,
      });
      await refetch();
      toast.success(enabled ? "Maintenance mode is on" : "The shop is live again");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const preview = endsAt ? countdownParts(new Date(endsAt).toISOString(), now) : null;

  return (
    <div className="grid gap-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Wrench className="h-5 w-5 text-primary" /> Maintenance mode
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          While this is on, shoppers see a holding page instead of the shop. You and your staff can
          still browse and work in the admin panel.
        </p>
      </header>

      <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-bold">Close the shop for shoppers</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "The holding page is showing." : "The shop is open as normal."}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Maintenance mode" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="heading">Headline</Label>
          <Input id="heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="message">Message to shoppers</Label>
          <Textarea
            id="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="endsAt">Back online at</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          <div className="mt-1 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setEndsAt(toLocalInput(new Date(Date.now() + p.minutes * 60_000).toISOString()))}
              >
                {p.label}
              </Button>
            ))}
            {endsAt && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setEndsAt("")}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The shop reopens on its own at this time. Leave it empty to stay closed until you switch
            it off.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Show the countdown</p>
            <p className="text-xs text-muted-foreground">
              {preview
                ? `Shoppers would see ${preview.days}d ${preview.hours}h ${preview.minutes}m ${preview.seconds}s left.`
                : "Add a time above to show a live countdown."}
            </p>
          </div>
          <Switch
            checked={showCountdown}
            onCheckedChange={setShowCountdown}
            aria-label="Show countdown"
          />
        </div>

        <div>
          <Button className="rounded-full" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </div>
      </section>
    </div>
  );
}
