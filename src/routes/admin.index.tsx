import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, IndianRupee, Package, ShoppingBag, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchDashboard } from "@/lib/admin";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: fetchDashboard });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Revenue"
          value={formatINR(data.revenue)}
          hint={`${formatINR(data.revenue30)} in the last 30 days`}
          icon={IndianRupee}
        />
        <Kpi
          label="Orders"
          value={String(data.orderCount)}
          hint={`${data.orders30} in the last 30 days · ${data.pending} to fulfil`}
          icon={ShoppingBag}
        />
        <Kpi
          label="Customers"
          value={String(data.customers)}
          hint={`Average order ${formatINR(Math.round(data.averageOrder))}`}
          icon={Users}
        />
        <Kpi
          label="Catalogue"
          value={String(data.products)}
          hint={`${data.lowStock} low on stock · ${data.activeCoupons} live coupons`}
          icon={Package}
        />
      </section>

      {data.lowStock > 0 || data.openMessages > 0 ? (
        <section className="flex flex-wrap gap-3">
          {data.lowStock > 0 ? (
            <Link
              to="/admin/inventory"
              className="flex items-center gap-2 rounded-full bg-saffron/15 px-4 py-2 text-sm font-semibold text-foreground"
            >
              <AlertTriangle className="h-4 w-4 text-saffron" />
              {data.lowStock} title{data.lowStock === 1 ? "" : "s"} need restocking
            </Link>
          ) : null}
          {data.openMessages > 0 ? (
            <Link
              to="/admin/messages"
              className="rounded-full bg-muted px-4 py-2 text-sm font-semibold"
            >
              {data.openMessages} unread message{data.openMessages === 1 ? "" : "s"}
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Recent orders</h2>
            <Link to="/admin/orders" className="text-xs font-semibold text-primary">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {data.recentOrders.length === 0 ? (
              <li className="py-6 text-sm text-muted-foreground">No orders yet.</li>
            ) : (
              data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: o.id }}
                      className="truncate text-sm font-bold hover:text-primary"
                    >
                      #{o.order_number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.full_name} · {o.items.length} item{o.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatINR(o.total)}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
                      {o.status}
                    </Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Recent customers</h2>
            <Link to="/admin/customers" className="text-xs font-semibold text-primary">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {data.recentCustomers.length === 0 ? (
              <li className="py-6 text-sm text-muted-foreground">No customers yet.</li>
            ) : (
              data.recentCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.email || c.phone || c.city || "No contact details"}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {c.orders} order{c.orders === 1 ? "" : "s"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {data.statusBreakdown.length > 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-base font-bold">Orders by status</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {data.statusBreakdown.map((s) => (
              <div key={s.status} className="rounded-xl bg-muted px-4 py-3">
                <p className="text-xs font-semibold capitalize text-muted-foreground">{s.status}</p>
                <p className="text-lg font-bold">{s.count}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
