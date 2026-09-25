// src/routes/admin_.login.tsx
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
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
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Side: Auth Form */}
      <div className="flex w-full flex-col justify-between p-8 sm:p-12 lg:w-1/2 lg:p-16">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Store
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm py-8">
          <div className="mb-6 flex items-center gap-3">
            <img src={logo} alt="Sanabooks" className="h-10 w-10 rounded-full object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Sanabooks India</p>
              <h1 className="text-xl font-bold tracking-tight">Staff Sign In</h1>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                required
                placeholder="name@sanabooks.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1"
              />
            </div>

            <Button type="submit" className="mt-2 w-full rounded-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Sign in to Dashboard
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Restricted area. All sign-in attempts are verified against team records.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sanabooks India Management Console
        </p>
      </div>

      {/* Right Side: Branded Showcase */}
      <div className="hidden flex-col justify-between bg-navy p-12 text-navy-foreground lg:flex lg:w-1/2 lg:p-16">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-saffron" />
          <span className="text-xs font-bold uppercase tracking-widest text-saffron">Secure Control Panel</span>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Curating India's finest early-learning libraries.
          </h2>
          <p className="text-sm leading-relaxed text-navy-foreground/80">
            Manage your catalogue of 85+ educational titles, track order fulfillments, oversee customer accounts, and adjust live store settings.
          </p>
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Real-time inventory and coupon management</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Pincode-based delivery routing across India</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Role-based team permissions and access audit</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-navy-foreground/60">
          <BookOpen className="h-4 w-4" />
          <span>Sanabooks Singapore & India Expansion Platform</span>
        </div>
      </div>
    </div>
  );
}
