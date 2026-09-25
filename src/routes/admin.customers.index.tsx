import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCustomerSummaries } from "@/lib/admin";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/admin/customers/")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: fetchCustomerSummaries,
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (c) =>
        !needle ||
        `${c.name} ${c.email} ${c.phone ?? ""} ${c.city ?? ""} ${c.childName ?? ""}`
          .toLowerCase()
          .includes(needle),
    );
  }, [data, q]);

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, city"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Child</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Spend</th>
              <th className="px-4 py-3 text-left">Last order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No customers yet.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.city ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{c.email || "—"}</p>
                    <p className="text-muted-foreground">{c.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.childName ? `${c.childName}${c.childAge ? `, ${c.childAge}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{c.orders}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatINR(c.spend)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
