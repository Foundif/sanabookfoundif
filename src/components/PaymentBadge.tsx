const STYLES: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-leaf/15 text-leaf" },
  pending: { label: "Awaiting payment", cls: "bg-secondary text-muted-foreground" },
  cancelled: { label: "Payment cancelled", cls: "bg-destructive/10 text-destructive" },
  failed: { label: "Payment failed", cls: "bg-destructive/10 text-destructive" },
  cod_pending: { label: "COD (old)", cls: "bg-secondary text-muted-foreground" },
};

/** Shows whether Razorpay actually collected the money for an order. */
export function PaymentBadge({ status }: { status: string | null | undefined }) {
  const s = STYLES[status ?? "pending"] ?? { label: status ?? "Unknown", cls: "bg-secondary" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}
