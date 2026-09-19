import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchStock, updateStock, type StockRow } from "@/lib/admin";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

function StockLine({ row }: { row: StockRow }) {
  const qc = useQueryClient();
  const [stock, setStock] = useState(String(row.stock));
  const [threshold, setThreshold] = useState(String(row.low_stock_threshold));

  useEffect(() => {
    setStock(String(row.stock));
    setThreshold(String(row.low_stock_threshold));
  }, [row.stock, row.low_stock_threshold]);

  const save = useMutation({
    mutationFn: () => updateStock(row.id, Number(stock) || 0, Number(threshold) || 0),
    onSuccess: async () => {
      toast.success(`${row.title} updated`);
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Could not save that stock level"),
  });

  const low = row.stock <= row.low_stock_threshold;
  const dirty = stock !== String(row.stock) || threshold !== String(row.low_stock_threshold);

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt=""
              loading="lazy"
              className="h-12 w-9 rounded object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.product_type}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Input
          value={stock}
          inputMode="numeric"
          onChange={(e) => setStock(e.target.value)}
          className="h-9 w-24"
        />
      </td>
      <td className="px-4 py-3">
        <Input
          value={threshold}
          inputMode="numeric"
          onChange={(e) => setThreshold(e.target.value)}
          className="h-9 w-24"
        />
      </td>
      <td className="px-4 py-3">
        {low ? (
          <Badge className="bg-saffron/20 text-foreground hover:bg-saffron/20">
            <AlertTriangle className="mr-1 h-3 w-3" /> Restock
          </Badge>
        ) : (
          <Badge variant="secondary">In stock</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-full"
        >
          Save
        </Button>
      </td>
    </tr>
  );
}

function AdminInventory() {
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stock"], queryFn: fetchStock });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchText = !needle || `${r.title} ${r.product_type}`.toLowerCase().includes(needle);
      const matchLow = !lowOnly || r.stock <= r.low_stock_threshold;
      return matchText && matchLow;
    });
  }, [data, q, lowOnly]);

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles"
            className="pl-9"
          />
        </div>
        <Button
          variant={lowOnly ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setLowOnly((v) => !v)}
        >
          Low stock only
        </Button>
      </div>

      {(data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Stock is tracked for titles you add in the Products tab.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">In stock</th>
                <th className="px-4 py-3 text-left">Alert below</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <StockLine key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
