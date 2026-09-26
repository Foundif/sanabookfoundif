import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  deleteProduct,
  emptyProduct,
  fetchAdminProduct,
  saveProductReturningId,
  uploadProductImage,
  type ProductInput,
  type ProductVariantItem,
} from "@/lib/cms";
import { AGE_GROUPS, CATEGORIES, invalidateProductCache } from "@/lib/catalog";

export const Route = createFileRoute("/admin/products/$id")({
  component: ProductEditor,
});

type Draft = ProductInput & { stock: number; low_stock_threshold: number };

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ProductEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft | null>(
    isNew ? { ...emptyProduct, stock: 0, low_stock_threshold: 5 } : null,
  );
  const [original, setOriginal] = useState<string>("");
  const [tagText, setTagText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<null | "save" | "delete" | "discard">(null);

  // New variant helper states
  const [newVarTitle, setNewVarTitle] = useState("");
  const [newVarPrice, setNewVarPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => fetchAdminProduct(id),
    enabled: !isNew,
  });

  useEffect(() => {
    if (isNew) {
      setOriginal(JSON.stringify({ ...emptyProduct, stock: 0, low_stock_threshold: 5 }));
      return;
    }
    if (!data) return;
    const d: Draft = {
      handle: data.handle,
      title: data.title,
      description: data.description,
      product_type: data.product_type,
      tags: data.tags ?? [],
      age_tag: data.age_tag,
      price: Number(data.price),
      compare_at_price: data.compare_at_price == null ? null : Number(data.compare_at_price),
      image_url: data.image_url,
      images: data.images ?? [],
      badge: data.badge,
      sort_order: data.sort_order,
      active: data.active,
      stock: data.stock ?? 0,
      low_stock_threshold: data.low_stock_threshold ?? 5,
      options: data.options ?? [],
      variants: data.variants ?? [],
    };
    setDraft(d);
    setOriginal(JSON.stringify(d));
    setTagText((d.tags ?? []).join(", "));
  }, [data, isNew]);

  const dirty = !!draft && JSON.stringify(draft) !== original;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  /** Gallery: primary cover first, then extras. */
  const gallery = draft
    ? [...new Set([...(draft.image_url ? [draft.image_url] : []), ...(draft.images ?? [])])]
    : [];
  const setGallery = (list: string[]) =>
    setDraft((d) => (d ? { ...d, image_url: list[0] ?? null, images: list.slice(1) } : d));

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
      return saveProductReturningId({ ...input, handle, ...(isNew ? {} : { id }) } as ProductInput & {
        id?: string;
      });
    },
    onSuccess: async (newId) => {
      toast.success("Saved — it is live in the shop now");
      setConfirm(null);
      if (draft) setOriginal(JSON.stringify(draft));
      await refreshEverywhere();
      if (isNew) navigate({ to: "/admin/products/$id", params: { id: newId }, replace: true });
    },
    onError: (e) => {
      setConfirm(null);
      toast.error(e instanceof Error ? e.message : "Could not save this product");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: async () => {
      toast.success("Product deleted");
      await refreshEverywhere();
      navigate({ to: "/admin/products" });
    },
    onError: () => toast.error("Could not delete this product"),
  });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name} is larger than 10 MB`);
          continue;
        }
        const u = await uploadProductImage(f);
        urls.push(u);
      }
      if (urls.length) {
        setGallery([...gallery, ...urls]);
        toast.success(`Uploaded ${urls.length} photo${urls.length > 1 ? "s" : ""}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Variant Helpers
  const addVariant = () => {
    if (!newVarTitle.trim()) {
      toast.error("Please enter a variation name (e.g. 32 Pages, Age 3-5, Hardcover)");
      return;
    }
    const priceNum = parseFloat(newVarPrice) || draft?.price || 0;
    const newVariant: ProductVariantItem = {
      id: `var-${Date.now()}`,
      title: newVarTitle.trim(),
      price: priceNum,
      compare_at_price: draft?.compare_at_price ?? null,
      stock: draft?.stock ?? 10,
    };
    const updated = [...(draft?.variants ?? []), newVariant];
    set("variants", updated);
    setNewVarTitle("");
    setNewVarPrice("");
    toast.success(`Added variant: ${newVariant.title}`);
  };

  const removeVariant = (index: number) => {
    const updated = (draft?.variants ?? []).filter((_, i) => i !== index);
    set("variants", updated);
  };

  const updateVariant = (index: number, patch: Partial<ProductVariantItem>) => {
    const updated = (draft?.variants ?? []).map((v, i) => (i === index ? { ...v, ...patch } : v));
    set("variants", updated);
  };

  const quickPopulateAges = () => {
    const basePrice = draft?.price || 199;
    const variants: ProductVariantItem[] = [
      { id: `var-age-1`, title: "Age 2–3 (Board Book)", price: basePrice, compare_at_price: null, stock: 15 },
      { id: `var-age-2`, title: "Age 4–5 (Activity)", price: basePrice + 30, compare_at_price: null, stock: 20 },
      { id: `var-age-3`, title: "Age 6–8 (Advanced)", price: basePrice + 50, compare_at_price: null, stock: 15 },
    ];
    set("variants", variants);
    toast.success("Added age-based variants template");
  };

  const quickPopulatePages = () => {
    const basePrice = draft?.price || 149;
    const variants: ProductVariantItem[] = [
      { id: `var-p-1`, title: "32 Pages", price: basePrice, compare_at_price: null, stock: 25 },
      { id: `var-p-2`, title: "64 Pages", price: basePrice + 50, compare_at_price: null, stock: 20 },
      { id: `var-p-3`, title: "128 Pages Jumbo", price: basePrice + 100, compare_at_price: null, stock: 15 },
    ];
    set("variants", variants);
    toast.success("Added page-count variants template");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="mx-auto max-w-4xl pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">
              {isNew ? "New Product" : draft.title || "Untitled Product"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isNew ? "Create a book or bundle" : `/product/${draft.handle}`}
            </p>
          </div>
        </div>

        {!isNew && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setConfirm("delete")}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      {/* Main form */}
      <div className="space-y-6 px-4 py-6 sm:px-6">
        {/* Title, handle & description */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Basic Details
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => {
                  const title = e.target.value;
                  set("title", title);
                  if (isNew && !draft.handle) set("handle", slugify(title));
                }}
                placeholder="e.g. 100 First Words Jumbo Board Book"
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="handle">URL Handle</Label>
                <Input
                  id="handle"
                  value={draft.handle}
                  onChange={(e) => set("handle", slugify(e.target.value))}
                  placeholder="100-first-words"
                  className="mt-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <Label htmlFor="badge">Promotional Badge</Label>
                <Input
                  id="badge"
                  value={draft.badge ?? ""}
                  onChange={(e) => set("badge", e.target.value || null)}
                  placeholder="Bestseller, New, 20% Off"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Book summary, contents, learning outcomes..."
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Product Variations / Options Builder */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Product Variations & Options
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add custom variations like ages, page counts, formats, or bindings with their own prices.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={quickPopulatePages}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" /> + Pages Template
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={quickPopulateAges}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" /> + Ages Template
              </Button>
            </div>
          </div>

          {/* Existing variants table */}
          {draft.variants && draft.variants.length > 0 ? (
            <div className="mt-5 space-y-3">
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Variation Name</th>
                      <th className="px-3 py-2.5 font-semibold">Price (₹)</th>
                      <th className="px-3 py-2.5 font-semibold">Compare at (₹)</th>
                      <th className="px-3 py-2.5 font-semibold">Stock</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {draft.variants.map((v, i) => (
                      <tr key={v.id || i} className="hover:bg-muted/40">
                        <td className="p-2.5">
                          <Input
                            value={v.title}
                            onChange={(e) => updateVariant(i, { title: e.target.value })}
                            className="h-8 text-xs font-medium"
                            placeholder="e.g. 64 Pages"
                          />
                        </td>
                        <td className="p-2.5 w-28">
                          <Input
                            type="number"
                            value={v.price}
                            onChange={(e) => updateVariant(i, { price: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2.5 w-28">
                          <Input
                            type="number"
                            value={v.compare_at_price ?? ""}
                            onChange={(e) =>
                              updateVariant(i, {
                                compare_at_price: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="h-8 text-xs"
                            placeholder="Optional"
                          />
                        </td>
                        <td className="p-2.5 w-24">
                          <Input
                            type="number"
                            value={v.stock ?? 0}
                            onChange={(e) => updateVariant(i, { stock: parseInt(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => removeVariant(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No custom variations added yet. The product will use the default price (₹{draft.price}) below.
            </div>
          )}

          {/* Add variant row */}
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-secondary/30 p-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Add Variation Name</Label>
              <Input
                value={newVarTitle}
                onChange={(e) => setNewVarTitle(e.target.value)}
                placeholder="e.g. 64 Pages or Age 5-7"
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div className="w-28">
              <Label className="text-xs">Price (₹)</Label>
              <Input
                type="number"
                value={newVarPrice}
                onChange={(e) => setNewVarPrice(e.target.value)}
                placeholder={String(draft.price || 199)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addVariant}
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Variation
            </Button>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Base Pricing & Inventory
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="price">Default Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={1}
                value={draft.price}
                onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="compare_at">Compare-at Price (₹)</Label>
              <Input
                id="compare_at"
                type="number"
                min={0}
                step={1}
                value={draft.compare_at_price ?? ""}
                onChange={(e) =>
                  set("compare_at_price", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="MRP / Original price (optional)"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="stock">Base Stock Available</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                value={draft.stock}
                onChange={(e) => set("stock", parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="low_stock">Low Stock Warning At</Label>
              <Input
                id="low_stock"
                type="number"
                min={0}
                value={draft.low_stock_threshold}
                onChange={(e) => set("low_stock_threshold", parseInt(e.target.value) || 5)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Category & Tags */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Organization & Age Bracket
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select
                value={draft.product_type}
                onValueChange={(val) => set("product_type", val)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recommended Age Bracket</Label>
              <Select
                value={draft.age_tag ?? "none"}
                onValueChange={(val) => set("age_tag", val === "none" ? null : val)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select age group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific age bracket</SelectItem>
                  {AGE_GROUPS.map((a) => (
                    <SelectItem key={a.tag} value={a.tag}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tagText}
                onChange={(e) => {
                  setTagText(e.target.value);
                  const clean = e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  set("tags", clean);
                }}
                placeholder="bestseller, phonics, wipe-clean"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Photos & Covers ({gallery.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-1.5 h-4 w-4" />
              )}
              Upload Photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((url, i) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Cover
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      title="Set as Cover"
                      onClick={() => {
                        const next = [url, ...gallery.filter((_, idx) => idx !== i)];
                        setGallery(next);
                      }}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-white/20"
                    title="Remove"
                    onClick={() => {
                      const next = gallery.filter((_, idx) => idx !== i);
                      setGallery(next);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active" className="font-bold">
                Live in Storefront
              </Label>
              <p className="text-xs text-muted-foreground">
                When active, shoppers can find, browse and purchase this book.
              </p>
            </div>
            <Switch
              id="active"
              checked={draft.active}
              onCheckedChange={(val) => set("active", val)}
            />
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      {dirty && (
        <aside
          aria-label="Unsaved changes bar"
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-5 py-2.5 shadow-2xl backdrop-blur"
        >
          <span className="text-xs font-semibold">Unsaved changes</span>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => setConfirm("discard")}
          >
            Discard
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            disabled={save.isPending}
            onClick={() => setConfirm("save")}
          >
            {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </aside>
      )}

      {/* Confirmations */}
      <ConfirmDialog
        open={confirm === "save"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Save changes?"
        description="This will update the live catalogue on the shop immediately."
        confirmLabel="Yes, save"
        cancelLabel="Keep editing"
        onConfirm={() => draft && save.mutate(draft)}
      />

      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Discard changes?"
        description="All your unsaved changes will be lost."
        confirmLabel="Yes, discard"
        cancelLabel="Continue editing"
        destructive
        onConfirm={() => {
          setDraft(JSON.parse(original));
          setConfirm(null);
        }}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this product?"
        description="This action cannot be undone. It will remove this product from the storefront."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
