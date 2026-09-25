import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderTree,
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Trash2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { fetchCategories, deleteCategory, type CategoryRow } from "@/lib/categories";
import { fetchAdminProducts } from "@/lib/cms";

export const Route = createFileRoute("/admin/categories/")({
  component: AdminCategoriesIndex,
});

function AdminCategoriesIndex() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<CategoryRow | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not delete category");
      setToDelete(null);
    },
  });

  // Calculate product count per category
  const productCountMap = (products ?? []).reduce<Record<string, number>>((acc, p) => {
    const key = (p.product_type || "").toLowerCase().trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filtered = categories.filter((c) => {
    const query = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      (c.description ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage store sections, hero thumbnails, and homepage collections.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/admin/categories/$id", params: { id: "new" } })}
          className="rounded-full shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add category
        </Button>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name or slug..."
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Showing <strong>{filtered.length}</strong> of {categories.length} categories
        </p>
      </div>

      {/* Categories Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-4 text-base font-semibold">No categories found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "No matching categories for your search." : "Get started by adding your first category."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3 text-center">Featured</th>
                  <th className="px-4 py-3 text-center">Sort Order</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((cat) => {
                  const count = productCountMap[cat.name.toLowerCase().trim()] || 0;
                  return (
                    <tr
                      key={cat.id}
                      onClick={() => navigate({ to: "/admin/categories/$id", params: { id: cat.id } })}
                      className="group cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                            {cat.image_url ? (
                              <img
                                src={cat.image_url}
                                alt={cat.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                                <FolderTree className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {cat.name}
                            </p>
                            {cat.description && (
                              <p className="line-clamp-1 max-w-sm text-xs text-muted-foreground">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        {cat.id}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="secondary" className="gap-1 font-mono text-xs">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          {count}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {cat.featured ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 gap-1 border-amber-500/30">
                            <Sparkles className="h-3 w-3 fill-current" /> Featured
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground">
                        {cat.sort_order}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate({ to: "/admin/categories/$id", params: { id: cat.id } })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setToDelete(cat)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete "${toDelete?.name}"?`}
        description="Are you sure you want to remove this category? Products assigned to it will remain safe in your store."
        confirmLabel="Yes, delete category"
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
