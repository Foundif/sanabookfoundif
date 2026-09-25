// src/routes/admin.settings.tsx
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  DEFAULT_NOTICES,
  countdownParts,
  fetchSiteSettings,
  saveSiteSettings,
} from "@/lib/settings";
import {
  addTeamMember,
  listTeamMembers,
  removeTeamMember,
} from "@/lib/team.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Store settings — Sanabooks India admin" },
      { name: "description", content: "Maintenance mode, header notices, and team access." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

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
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: fetchSiteSettings,
  });

  // Team server functions
  const fetchTeam = useServerFn(listTeamMembers);
  const createTeam = useServerFn(addTeamMember);
  const deleteTeam = useServerFn(removeTeamMember);

  const {
    data: teamMembers,
    isLoading: teamLoading,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: ["admin-team-members"],
    queryFn: () => fetchTeam(),
  });

  // Maintenance state
  const [enabled, setEnabled] = useState(false);
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [showCountdown, setShowCountdown] = useState(true);

  // Header notice state
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [noticesText, setNoticesText] = useState("");

  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Add team modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("admin");
  const [teamBusy, setTeamBusy] = useState(false);

  // Remove team dialog state
  const [removeTarget, setRemoveTarget] = useState<{ id: string; userId: string; email: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.maintenance_enabled);
    setHeading(data.maintenance_heading);
    setMessage(data.maintenance_message);
    setEndsAt(toLocalInput(data.maintenance_ends_at));
    setShowCountdown(data.show_countdown);
    setNoticeEnabled(data.header_notice_enabled ?? true);
    setNoticesText(
      (data.header_notices && data.header_notices.length > 0
        ? data.header_notices
        : DEFAULT_NOTICES
      ).join("\n"),
    );
  }, [data]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const saveAll = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const parsedNotices = noticesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await saveSiteSettings(data.id, {
        maintenance_enabled: enabled,
        maintenance_heading: heading.trim() || "We are getting the shelves ready",
        maintenance_message: message.trim(),
        maintenance_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        show_countdown: showCountdown,
        header_notice_enabled: noticeEnabled,
        header_notices: parsedNotices.length > 0 ? parsedNotices : DEFAULT_NOTICES,
      });

      await refetch();
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Could not save settings. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error("Please fill in email and password");
      return;
    }
    setTeamBusy(true);
    try {
      await createTeam({
        data: {
          email: newEmail.trim().toLowerCase(),
          password: newPassword.trim(),
          role: newRole,
        },
      });
      toast.success(`Added ${newEmail} as ${newRole}`);
      setNewEmail("");
      setNewPassword("");
      setAddOpen(false);
      refetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to add team member");
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoveBusy(true);
    try {
      await deleteTeam({
        data: {
          roleId: removeTarget.id,
          targetUserId: removeTarget.userId,
        },
      });
      toast.success(`Removed access for ${removeTarget.email}`);
      setRemoveTarget(null);
      refetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    } finally {
      setRemoveBusy(false);
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
  const currentNoticesList = noticesText.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="grid max-w-4xl gap-8 pb-12">
      {/* 1. Header Notice Bar Customization */}
      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Bell className="h-5 w-5 text-primary" /> Top Notice Bar (Marquee)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize the announcement ticker scrolling at the very top of every page.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {noticeEnabled ? "Visible" : "Hidden"}
            </span>
            <Switch
              checked={noticeEnabled}
              onCheckedChange={setNoticeEnabled}
              aria-label="Toggle notice bar"
            />
          </div>
        </header>

        {noticeEnabled && (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="notices">Notice Messages (one per line)</Label>
              <Textarea
                id="notices"
                rows={4}
                value={noticesText}
                onChange={(e) => setNoticesText(e.target.value)}
                placeholder="Free shipping over ₹499&#10;Cash on delivery available&#10;Up to 25% off bundles"
                className="font-mono text-sm leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Each line appears as a separate message with a dot separator. Seamlessly repeated across the screen.
              </p>
            </div>

            {/* Live Ticker Preview */}
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Preview
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {currentNoticesList.map((n, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 py-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-leaf" />
                    {n}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <Button onClick={saveAll} disabled={busy} className="rounded-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Notice Settings
          </Button>
        </div>
      </section>

      {/* 2. Team & Admin Access */}
      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" /> Store Team & Admin Access
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add multiple administrators or staff members who can sign in at <code className="text-xs bg-muted px-1 py-0.5 rounded">/admin/login</code>.
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full gap-1.5">
                <UserPlus className="h-4 w-4" /> Add team member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddMember} className="grid gap-4">
                <DialogHeader>
                  <DialogTitle>Add Admin or Staff</DialogTitle>
                  <DialogDescription>
                    Create credentials for a new team member. They can immediately log in to the admin panel.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2">
                  <Label htmlFor="teamEmail">Email address</Label>
                  <Input
                    id="teamEmail"
                    type="email"
                    required
                    placeholder="teammember@sanabooks.in"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="teamPassword">Temporary Password</Label>
                  <Input
                    id="teamPassword"
                    type="text"
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="teamRole">Role</Label>
                  <Select value={newRole} onValueChange={(v: "admin" | "staff") => setNewRole(v)}>
                    <SelectTrigger id="teamRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        Store Admin (Full control, settings, products, team)
                      </SelectItem>
                      <SelectItem value="staff">
                        Staff (Orders, inventory, messages — no store settings)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={teamBusy}>
                    {teamBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {teamLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
            <p className="mt-2">Loading team members...</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {(teamMembers ?? []).map((m) => {
              const isCurrentUser = m.userId === user?.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {m.role === "admin" ? <Shield className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{m.email}</span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-[10px] text-primary">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        Role: <span className="font-medium text-foreground">{m.role}</span>
                      </p>
                    </div>
                  </div>

                  {!isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setRemoveTarget({ id: m.id, userId: m.userId, email: m.email })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Maintenance Mode */}
      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Wrench className="h-5 w-5 text-primary" /> Maintenance Mode
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              While on, shoppers see a holding page instead of the storefront. Admin routes remain accessible.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {enabled ? "Closed" : "Live"}
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Maintenance mode" />
          </div>
        </header>

        <div className="grid gap-1.5">
          <Label htmlFor="heading">Headline</Label>
          <Input id="heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="message">Message to shoppers</Label>
          <Textarea
            id="message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="endsAt">Back online at (optional)</Label>
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
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Show live countdown</p>
            <p className="text-xs text-muted-foreground">
              {preview
                ? `Shoppers see ${preview.days}d ${preview.hours}h ${preview.minutes}m ${preview.seconds}s left.`
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
          <Button className="rounded-full" onClick={saveAll} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Maintenance Settings
          </Button>
        </div>
      </section>

      {/* Confirm member deletion */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Revoke team access?"
        description={`This will immediately revoke ${removeTarget?.email}'s access to the admin panel.`}
        confirmLabel="Revoke access"
        cancelLabel="Keep access"
        destructive
        loading={removeBusy}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}
