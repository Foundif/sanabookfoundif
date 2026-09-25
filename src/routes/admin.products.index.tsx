import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteProduct,
  emptyProduct,
  fetchAdminProducts,
  saveProduct,
  type ProductInput,
  type ProductRow,
} from "@/lib/cms";
import { AGE_GROUPS, CATEGORIES, formatINR, invalidateProductCache } from "@/lib/catalog";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProducts,
});

type Draft = ProductInput & { id?: string; stock?: number; low_stock_threshold?: number };

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function AdminProducts() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tagText, setTagText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });

  /** Refresh admin table AND every shop surface so changes are visible at once. */
  const refreshEverywhere = async () => {
    invalidateProductCache();
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin"] }),
      qc.invalidateQueries({ queryKey: ["products"] }),
      qc.invalidateQueries({ queryKey: ["product"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: async (input: Draft) => {
      const handle = input.handle.trim() || slugify(input.title);
      await saveProduct({ ...input, handle, tags: input.tags ?? [] });
    },
    onSuccess: async () => {
      toast.success("Saved — it is live in the shop now");
      setDraft(null);
      await refreshEverywhere();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save this product"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      toast.success("Product removed from the shop");
      setConfirmDelete(null);
      await refreshEverywhere();
    },
    onError: () => toast.error("Could not delete this product"),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (p) => !needle || `${p.title} ${p.handle} ${p.product_type}`.toLowerCase().includes(needle),
    );
  }, [data, q]);

  const openNew = () => {
    setDraft({ ...emptyProduct });
    setTagText("");
  };
  const openEdit = (p: ProductRow) => {
    setDraft({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description,
      product_type: p.product_type,
      tags: p.tags ?? [],
      age_tag: p.age_tag,
      price: p.price,
      compare_at_price: p.compare_at_price,
      image_url: p.image_url,
      badge: p.badge,
      sort_order: p.sort_order,
      active: p.active,
    });
    setTagText((p.tags ?? []).join(", "));
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

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
        <Button className="rounded-full" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Add product
        </Button>
      </div>

      {(data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No products added here yet. Anything you add appears in the shop straight away, alongside
            the built-in catalogue.
          </p>
          <Button className="mt-4 rounded-full" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Add your first product
          </Button>
        </div>
      ) : (
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
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          loading="lazy"
                          className="h-12 w-9 rounded object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">/{p.handle}</p>
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
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmDelete(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Saving publishes straight to the shop pages and search.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="p-title">Title</Label>
                <Input
                  id="p-title"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="My First Phonics Workbook"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-handle">Web address</Label>
                <Input
                  id="p-handle"
                  value={draft.handle}
                  onChange={(e) => set("handle", slugify(e.target.value))}
                  placeholder="auto from the title"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.product_type}
                  onValueChange={(v) => set("product_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Age group</Label>
                <Select
                  value={draft.age_tag ?? "none"}
                  onValueChange={(v) => set("age_tag", v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All ages</SelectItem>
                    {AGE_GROUPS.map((a) => (
                      <SelectItem key={a.tag} value={a.tag}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-badge">Badge</Label>
                <Input
                  id="p-badge"
                  value={draft.badge ?? ""}
                  onChange={(e) => set("badge", e.target.value || null)}
                  placeholder="Bestseller"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-price">Price (₹)</Label>
                <Input
                  id="p-price"
                  inputMode="decimal"
                  value={String(draft.price)}
                  onChange={(e) => set("price", Number(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-compare">Was price (₹)</Label>
                <Input
                  id="p-compare"
                  inputMode="decimal"
                  value={draft.compare_at_price == null ? "" : String(draft.compare_at_price)}
                  onChange={(e) =>
                    set("compare_at_price", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="optional"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="p-image">Cover image link</Label>
                <Input
                  id="p-image"
                  value={draft.image_url ?? ""}
                  onChange={(e) => set("image_url", e.target.value || null)}
                  placeholder="/catalog/cat-phonics.jpg or https://…"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="p-tags">Labels (comma separated)</Label>
                <Input
                  id="p-tags"
                  value={tagText}
                  onChange={(e) => {
                    setTagText(e.target.value);
                    set(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    );
                  }}
                  placeholder="bestseller, new"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-sort">Display order</Label>
                <Input
                  id="p-sort"
                  inputMode="numeric"
                  value={String(draft.sort_order)}
                  onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="p-active"
                  checked={draft.active}
                  onCheckedChange={(v) => set("active", v)}
                />
                <Label htmlFor="p-active">Show in the shop</Label>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={!draft?.title || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              {draft?.id ? "Save changes" : "Publish product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirmDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the shop immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
