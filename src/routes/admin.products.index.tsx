import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteProduct, fetchAdminProducts, type ProductRow } from "@/lib/cms";
import { formatINR, invalidateProductCache } from "@/lib/catalog";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProducts,
});

function AdminProducts() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      toast.success("Product removed from the shop");
      setConfirmDelete(null);
      invalidateProductCache();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin"] }),
        qc.invalidateQueries({ queryKey: ["products"] }),
      ]);
    },
    onError: () => toast.error("Could not delete this product"),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (p) => !needle || `${p.title} ${p.handle} ${p.product_type}`.toLowerCase().includes(needle),
    );
  }, [data, q]);

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles, categories"
            className="pl-9"
          />
        </div>
        <Button className="rounded-full" asChild>
          <Link to="/admin/products/$id" params={{ id: "new" }}>
            <Plus className="mr-1 h-4 w-4" /> Add product
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Visibility</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate({ to: "/admin/products/$id", params: { id: p.id } })}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          loading="lazy"
                          className="h-12 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="grid h-12 w-9 place-items-center rounded bg-muted">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{p.handle} · {(p.images?.length ?? 0) + (p.image_url ? 1 : 0)} photos
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p>{p.product_type}</p>
                    <p className="text-xs text-muted-foreground">{p.age_tag ?? "All ages"}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{formatINR(p.price)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.active ? "secondary" : "outline"}>
                      {p.active ? "Live" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/admin/products/$id" params={{ id: p.id }} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Delete"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Delete “${confirmDelete?.title ?? ""}”?`}
        description="It will disappear from the shop immediately. This cannot be undone."
        confirmLabel="Yes, delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      />
    </div>
  );
}
