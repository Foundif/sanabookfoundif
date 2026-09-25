import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgePercent,
  Boxes,
  ChevronLeft,
  ExternalLink,
  FileText,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { toast } from "sonner";
import logo from "@/assets/sanabooks-logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

type AdminPath =
  | "/admin"
  | "/admin/orders"
  | "/admin/customers"
  | "/admin/products"
  | "/admin/categories"
  | "/admin/inventory"
  | "/admin/coupons"
  | "/admin/messages"
  | "/admin/content"
  | "/admin/settings";

type NavItem = { to: AdminPath; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Sales",
    items: [
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/messages", label: "Inbox", icon: Inbox },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    title: "Store",
    items: [
      { to: "/admin/coupons", label: "Coupons", icon: BadgePercent },
      { to: "/admin/content", label: "Page content", icon: FileText },
      { to: "/admin/settings", label: "Settings", icon: Wrench },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

function AdminLayout() {
  const { user, loading } = useAuth();
  const { isStaff, isAdmin, loading: roleLoading, refetch } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("sana-admin-sidebar");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sana-admin-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/admin/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || roleLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
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
      </div>
    );
  }

  const current = [...ALL_ITEMS].reverse().find((i) => isActive(i, pathname));
  const sectionTitle = current?.label ?? "Dashboard";
  const initial = (user.email ?? "A").charAt(0).toUpperCase();

  const SidebarBody = ({ compact }: { compact: boolean }) => (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center gap-3 border-b border-border/60 px-4 py-4 ${compact ? "justify-center px-2" : ""}`}
      >
        <img
          src={logo}
          alt="Sanabooks India"
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
        />
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Sanabooks India</p>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Admin portal
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => (
          <div key={group.title}>
            {!compact && (
              <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item, pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={compact ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      compact ? "justify-center px-0" : ""
                    } ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/60 p-3">
        <Link
          to="/"
          title={compact ? "View live store" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            compact ? "justify-center px-0" : ""
          }`}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          {!compact && "View live store"}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <SidebarBody compact={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute top-4 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody compact={false} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open admin menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Store admin
            </p>
            <h1 className="truncate text-base font-bold md:text-lg">{sectionTitle}</h1>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initial}
            </span>
            <span className="max-w-[180px] truncate text-xs font-semibold">{user.email}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              {isAdmin ? "Owner" : "Staff"}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-6xl">
            {pathname !== "/admin" && (
              <Link
                to="/admin"
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
              </Link>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
