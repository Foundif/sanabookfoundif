import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgePercent,
  Boxes,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { claimAdmin, useRole } from "@/hooks/useRole";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Store admin — Sanabooks India" },
      {
        name: "description",
        content: "Manage orders, customers, catalogue, stock and coupons for Sanabooks India.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Store admin — Sanabooks India" },
      { property: "og:description", content: "Internal dashboard for the Sanabooks India store." },
    ],
  }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/coupons", label: "Coupons", icon: BadgePercent },
  { to: "/admin/messages", label: "Inbox", icon: Inbox },
  { to: "/admin/content", label: "Page content", icon: FileText },
] as const;

function AdminLayout() {
  const { user, loading } = useAuth();
  const { isStaff, isAdmin, loading: roleLoading, refetch } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading || roleLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Staff access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is for the Sanabooks team. If you are the store owner and no owner account has
          been set up yet, you can claim it now.
        </p>
        <Button
          className="mt-6 rounded-full"
          onClick={async () => {
            try {
              const ok = await claimAdmin();
              if (ok) {
                toast.success("You are now the store owner.");
                await refetch();
              } else {
                toast.error("An owner already exists. Ask them to add you as staff.");
              }
            } catch {
              toast.error("Could not claim owner access. Please try again.");
            }
          }}
        >
          Claim owner access
        </Button>
        <p className="mt-6 text-sm">
          <Link to="/" className="font-semibold text-primary">
            Back to the shop
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
            Sanabooks India
          </p>
          <h1 className="text-2xl font-bold md:text-3xl">Store admin</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Signed in as {user.email} · {isAdmin ? "Owner" : "Staff"}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:h-fit lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors lg:rounded-xl ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
