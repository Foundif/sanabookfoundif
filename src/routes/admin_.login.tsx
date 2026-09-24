import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/sanabooks-logo.png";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in | Sanabooks India" },
      { name: "description", content: "Staff sign-in for the Sanabooks India admin panel." },
      { property: "og:title", content: "Admin sign in | Sanabooks India" },
      { property: "og:description", content: "Staff sign-in for the Sanabooks India admin panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message ?? "Sign in failed");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const ok = roles?.some((r) => r.role === "admin" || r.role === "staff");
    setBusy(false);
    if (!ok) {
      await supabase.auth.signOut();
      toast.error("This account does not have admin access.");
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-shelf"
      >
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Sanabooks India" className="h-14 w-14 rounded-full bg-cream object-contain" />
          <p className="eyebrow mt-4 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin panel
          </p>
          <h1 className="mt-2 text-2xl font-bold">Staff sign in</h1>
          <p className="mt-1 text-xs text-muted-foreground">For Sanabooks India team members only.</p>
        </div>
        <div className="mt-6 space-y-3">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <Button type="submit" className="mt-5 w-full rounded-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Sign in to admin
        </Button>
      </form>
    </div>
  );
}
