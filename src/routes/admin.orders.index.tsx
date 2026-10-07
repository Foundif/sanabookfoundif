import { PaymentBadge } from "@/components/PaymentBadge";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAllOrders } from "@/lib/admin";
import { ORDER_STATUSES, updateOrderStatus } from "@/lib/orders";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/admin/orders/")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin", "orders"], queryFn: fetchAllOrders });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => updateOrderStatus(id, next),
    onSuccess: async () => {
      toast.success("Order updated");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => toast.error("Could not update that order"),
  });

  const [tab, setTab] = useState<"all" | "paid" | "abandoned">("all");
  const isPaid = (o: { payment_status?: string }) => o.payment_status === "paid";
  const counts = useMemo(() => {
    const list = data ?? [];
    const paid = list.filter((o) => isPaid(o as { payment_status?: string })).length;
    return { all: list.length, paid, abandoned: list.length - paid };
  }, [data]);

  const rows = useMemo(() => {
    const list = data ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((o) => {
      const paid = isPaid(o as { payment_status?: string });
      const matchTab = tab === "all" || (tab === "paid" ? paid : !paid);
      const matchStatus = status === "all" || o.status === status;
      const matchText =
        !needle ||
        `${o.order_number} ${o.full_name} ${o.email} ${o.phone} ${o.city}`
          .toLowerCase()
          .includes(needle);
      return matchTab && matchStatus && matchText;
    });
  }, [data, q, status, tab]);

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  const waLink = (o: { phone: string; full_name: string; order_number: string }) => {
    const digits = o.phone.replace(/\D/g, "").slice(-10);
    const msg = `Hi ${o.full_name}, this is Sanabooks India. We noticed your order #${o.order_number} wasn't completed. Need any help finishing your purchase?`;
    return `https://wa.me/91${digits}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["paid", "Paid"],
          ["abandoned", "Abandoned / Unpaid"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>
      {tab === "abandoned" && (
        <p className="text-xs text-muted-foreground">
          Customers who filled checkout details but did not finish payment. Tap WhatsApp to follow up.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order number, name, email"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Placed</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No orders match this view.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="align-middle">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: o.id }}
                      className="font-bold hover:text-primary"
                    >
                      #{o.order_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"}
                      {o.coupon_code ? ` · ${o.coupon_code}` : ""}
                    </p>
                    <div className="mt-1">
                      <PaymentBadge status={(o as { payment_status?: string }).payment_status} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{o.full_name}</p>
                    <p className="text-xs text-muted-foreground">{o.email}</p>
                    <p className="text-xs text-muted-foreground">{o.phone}</p>
                    {(o as { payment_status?: string }).payment_status !== "paid" && o.phone && (
                      <a
                        href={waLink(o)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center rounded-full bg-leaf/15 px-2.5 py-0.5 text-[11px] font-bold text-leaf hover:bg-leaf/25"
                      >
                        WhatsApp follow-up
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{formatINR(o.total)}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={o.status}
                      onValueChange={(next) => statusMutation.mutate({ id: o.id, next })}
                    >
                      <SelectTrigger className="h-9 w-[150px] capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {data?.length ?? 0} orders.{" "}
        <Badge variant="secondary">Tap an order number for the full invoice</Badge>
      </p>
    </div>
  );
}
