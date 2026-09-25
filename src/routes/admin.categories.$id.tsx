import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  fetchCategory,
  saveCategory,
  deleteCategory,
  uploadCategoryImage,
  slugifyCategory,
  emptyCategory,
  type CategoryInput,
} from "@/lib/categories";
import { fetchAdminProducts } from "@/lib/cms";

export const Route = createFileRoute("/admin/categories/$id")({
  component: CategoryEditor,
});

function CategoryEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<CategoryInput | null>(isNew ? { ...emptyCategory } : null);
  const [original, setOriginal] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<null | "save" | "delete" | "discard">(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "category", id],
    queryFn: () => fetchCategory(id),
    enabled: !isNew,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });

  useEffect(() => {
    if (isNew) {
      setOriginal(JSON.stringify(emptyCategory));
      return;
    }
    if (!data) return;
    const d: CategoryInput = {
      id: data.id,
      name: data.name,
      description: data.description ?? "",
      image_url: data.image_url,
      featured: data.featured,
      sort_order: data.sort_order,
    };
    setDraft(d);
    setOriginal(JSON.stringify(d));
  }, [data, isNew]);

  const dirty = !!draft && JSON.stringify(draft) !== original;
  const set = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = useMutation({
    mutationFn: async (input: CategoryInput) => {
      const finalId = isNew
        ? input.id.trim() || slugifyCategory(input.name)
        : input.id;
      return saveCategory({ ...input, id: finalId });
    },
    onSuccess: async (newId) => {
      toast.success("Category saved successfully");
      setConfirm(null);
      if (draft) setOriginal(JSON.stringify(draft));
      await qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      if (isNew) {
        navigate({ to: "/admin/categories/$id", params: { id: newId }, replace: true });
      }
    },
    onError: (e) => {
      setConfirm(null);
      toast.error(e instanceof Error ? e.message : "Could not save category");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteCategory(id),
    onSuccess: async () => {
      toast.success("Category deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      navigate({ to: "/admin/categories" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete category"),
  });

    const onFileSelect = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WebP)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      set("image_url", url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };


  if (isLoading || !draft) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Matching books in this category
  const matchingProducts = allProducts.filter(
    (p) => (p.product_type || "").toLowerCase().trim() === draft.name.toLowerCase().trim()
  );

  return (
    <div className="space-y-6 pb-24 max-w-4xl">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/categories"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isNew ? "New Category" : draft.name || "Untitled Category"}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              {isNew ? "Slug auto-generated from name" : `Slug: ${draft.id}`}
            </p>
          </div>
        </div>

        {!isNew && (
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setConfirm("delete")}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete category
          </Button>
        )}
      </div>

      {/* Main Form Cards */}
      <div className="grid gap-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Category Details</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={draft.name}
              placeholder="e.g. Activity Books"
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => (d ? { ...d, name, id: isNew ? slugifyCategory(name) : d.id } : d));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug / ID</Label>
            <Input
              id="slug"
              value={draft.id}
              disabled={!isNew}
              placeholder="activity-books"
              onChange={(e) => set("id", slugifyCategory(e.target.value))}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Used in web addresses and internal database indexing.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={draft.description ?? ""}
              placeholder="Short description displayed on category pages and menus..."
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>

        {/* Cover Artwork */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Category Artwork</h2>
              <p className="text-xs text-muted-foreground">
                Shown in the hero carousel, category cards, and shop mega menu.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileSelect(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-4 w-4" /> Upload photo
                </>
              )}
            </Button>
          </div>

          {draft.image_url ? (
            <div className="relative group max-w-sm overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={draft.image_url}
                alt={draft.name}
                className="h-48 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => set("image_url", null)}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm transition hover:bg-destructive hover:text-destructive-foreground shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 transition-colors bg-muted/20"
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium">Click to upload category image</p>
              <p className="text-xs text-muted-foreground">PNG, JPG or WebP (max 10MB)</p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Label htmlFor="image_url">Or paste image link</Label>
            <Input
              id="image_url"
              value={draft.image_url ?? ""}
              placeholder="https://... or /catalog/cat-example.jpg"
              onChange={(e) => set("image_url", e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Display Settings */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold">Storefront Settings</h2>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-4 w-4 text-amber-500" /> Featured on Homepage
              </Label>
              <p className="text-xs text-muted-foreground">
                Highlight this category in the homepage collections grid.
              </p>
            </div>
            <Switch
              checked={draft.featured}
              onCheckedChange={(checked) => set("featured", checked)}
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="sort_order">Display Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              value={draft.sort_order}
              onChange={(e) => set("sort_order", parseInt(e.target.value, 10) || 0)}
              className="w-32 font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Lower numbers appear first in the header mega menu and homepage list.
            </p>
          </div>
        </div>

        {/* Assigned Books Preview */}
        {!isNew && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Assigned Books ({matchingProducts.length})</h2>
              <Link to="/admin/products" className="text-xs font-semibold text-primary hover:underline">
                Manage products →
              </Link>
            </div>
            {matchingProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No products currently match product_type = "{draft.name}".
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {matchingProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="rounded-lg border border-border/70 p-2 text-xs">
                    <p className="font-semibold truncate">{p.title}</p>
                    <p className="text-muted-foreground font-mono">₹{p.price}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Save / Discard Bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-3 shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Unsaved changes
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setConfirm("discard")}>
                Discard
              </Button>
              <Button size="sm" onClick={() => setConfirm("save")} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save category
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirm === "save"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Save category changes?"
        description="This will update the category details and reflect immediately in your storefront."
        confirmLabel="Yes, save"
        loading={save.isPending}
        onConfirm={() => draft && save.mutate(draft)}
      />

      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Discard unsaved changes?"
        description="All changes made since your last save will be reset."
        confirmLabel="Yes, discard"
        onConfirm={() => {
          setDraft(JSON.parse(original));
          setConfirm(null);
        }}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Delete "${draft.name}"?`}
        description="Are you sure you want to delete this category? Products in this category will remain safe."
        confirmLabel="Yes, delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
