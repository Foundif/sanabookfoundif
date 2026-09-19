import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hammer } from "lucide-react";
import logo from "@/assets/sanabooks-logo.png";
import { countdownParts, fetchSiteSettings, maintenanceActive } from "@/lib/settings";
import { useRole } from "@/hooks/useRole";

/** Staff and the sign-in/admin routes always stay reachable so the team can switch it back on. */
const ALWAYS_OPEN = ["/admin", "/auth"];

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isStaff } = useRole();
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const blocked =
    maintenanceActive(settings, now) &&
    !isStaff &&
    !ALWAYS_OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!blocked || !settings) return <>{children}</>;

  const parts = settings.show_countdown ? countdownParts(settings.maintenance_ends_at, now) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-16 text-center">
      <img src={logo} alt="Sanabooks India" className="h-16 w-16 rounded-full object-contain" />
      <p className="eyebrow mt-6 flex items-center gap-2">
        <Hammer className="h-3.5 w-3.5" /> Shop temporarily closed
      </p>
      <h1 className="mt-3 max-w-2xl text-3xl font-bold md:text-4xl">
        {settings.maintenance_heading}
      </h1>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
        {settings.maintenance_message}
      </p>

      {parts && (
        <div className="mt-8 flex gap-3">
          {[
            { label: "Days", value: parts.days },
            { label: "Hours", value: parts.hours },
            { label: "Minutes", value: parts.minutes },
            { label: "Seconds", value: parts.seconds },
          ].map((p) => (
            <div
              key={p.label}
              className="min-w-18 rounded-xl border border-border bg-card px-4 py-3 shadow-lift"
            >
              <span className="block text-2xl font-bold tabular-nums">
                {String(p.value).padStart(2, "0")}
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Team member?{" "}
        <Link to="/auth" className="font-semibold text-primary underline">
          Sign in to continue
        </Link>
      </p>
    </div>
  );
}
