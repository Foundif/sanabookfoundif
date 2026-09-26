import { PaymentBadge } from "@/components/PaymentBadge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchOrderById } from "@/lib/admin";
import { ORDER_STATUSES, updateOrderStatus } from "@/lib/orders";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/admin/orders/$id")({
  component: AdminOrderDetail,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => fetchOrderById(id),
  });

  const statusMutation = useMutation({
    mutationFn: (next: string) => updateOrderStatus(id, next),
    onSuccess: async () => {
      toast.success("Status updated");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => toast.error("Could not update the status"),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">That order could not be found.</p>
        <Link to="/admin/orders" className="mt-3 inline-block text-sm font-semibold text-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All orders
          </Link>
          <h2 className="mt-1 text-2xl font-bold">#{data.order_number}</h2>
          <p className="text-xs text-muted-foreground">
            Placed {new Date(data.created_at).toLocaleString("en-IN")}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <PaymentBadge status={data.payment_status} />
            {data.payment_id && <span className="text-muted-foreground">Razorpay ID: {data.payment_id}</span>}
          </div>
        </div>
        <Select value={data.status} onValueChange={(next) => statusMutation.mutate(next)}>
          <SelectTrigger className="w-[170px] capitalize">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-base font-bold">Items</h3>
          <ul className="mt-4 divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-12 rounded-md object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.product_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.product_handle} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {formatINR(Number(item.unit_price) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-border pt-3">
            <Row label="Subtotal" value={formatINR(data.subtotal)} />
            {Number(data.discount) > 0 ? (
              <Row
                label={`Discount${data.coupon_code ? ` (${data.coupon_code})` : ""}`}
                value={`− ${formatINR(data.discount)}`}
              />
            ) : null}
            <Row
              label="Shipping"
              value={Number(data.shipping_fee) === 0 ? "Free" : formatINR(data.shipping_fee)}
            />
            {Number(data.cod_fee) > 0 ? (
              <Row label="COD handling" value={formatINR(data.cod_fee)} />
            ) : null}
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatINR(data.total)}</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-base font-bold">Customer</h3>
            <div className="mt-3">
              <Row label="Name" value={data.full_name} />
              <Row label="Email" value={data.email} />
              <Row label="Phone" value={data.phone} />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-base font-bold">Delivery</h3>
            <p className="mt-3 text-sm whitespace-pre-line">{data.address}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.city}, {data.state} {data.pincode ?? ""}
            </p>
            <div className="mt-3">
              <Row label="Shipping" value={data.shipping_method} />
              <Row label="Payment" value={data.payment_method.toUpperCase()} />
            </div>
          </div>
          {data.notes ? (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-base font-bold">Notes</h3>
              <p className="mt-2 text-sm whitespace-pre-line">{data.notes}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
