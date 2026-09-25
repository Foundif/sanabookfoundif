import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
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
        urls.push(await uploadProductImage(f));
      }
      if (urls.length) {
        setGallery([...gallery, ...urls]);
        toast.success(`${urls.length} photo${urls.length > 1 ? "s" : ""} added`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!isNew && isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!draft) return <p className="text-sm text-muted-foreground">Product not found.</p>;

  const goBack = () => (dirty ? setConfirm("discard") : navigate({ to: "/admin/products" }));

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Products
        </Button>
        <h1 className="text-xl font-bold">{isNew ? "Add product" : draft.title || "Edit product"}</h1>
        {!isNew && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-destructive"
            onClick={() => setConfirm("delete")}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="p-title">Title</Label>
              <Input
                id="p-title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="My First Phonics Workbook"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={6}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Photos</h2>
                <p className="text-xs text-muted-foreground">
                  The starred photo is the main cover shown on cards. Up to 10 MB each.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1 h-4 w-4" />
                )}
                Upload photos
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

            {gallery.length === 0 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void onFiles(e.dataTransfer.files);
                }}
                className="grid h-40 w-full place-items-center rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40"
              >
                Drop photos here or click to upload
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {gallery.map((url, i) => (
                  <div
                    key={url}
                    className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 ${i === 0 ? "border-primary" : "border-border"}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        Main
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-background/85 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === 0}
                        aria-label="Make main photo"
                        onClick={() => setGallery([url, ...gallery.filter((g) => g !== url)])}
                      >
                        <Star className={`h-3.5 w-3.5 ${i === 0 ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Remove photo"
                        onClick={() => setGallery(gallery.filter((g) => g !== url))}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 grid gap-1.5">
              <Label htmlFor="p-url" className="text-xs text-muted-foreground">
                Or add a photo link
              </Label>
              <Input
                id="p-url"
                placeholder="https://… then press Enter"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const v = e.currentTarget.value.trim();
                  if (v) setGallery([...gallery, v]);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-3">
            <h2 className="font-semibold sm:col-span-3">Pricing & stock</h2>
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
            <div className="grid gap-1.5">
              <Label htmlFor="p-stock">In stock</Label>
              <Input
                id="p-stock"
                inputMode="numeric"
                value={String(draft.stock)}
                onChange={(e) => set("stock", Number(e.target.value) || 0)}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold">Status</h2>
            <div className="flex items-center gap-3">
              <Switch
                id="p-active"
                checked={draft.active}
                onCheckedChange={(v) => set("active", v)}
              />
              <Label htmlFor="p-active">{draft.active ? "Live in the shop" : "Hidden"}</Label>
            </div>
          </section>
          <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold">Organisation</h2>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={draft.product_type} onValueChange={(v) => set("product_type", v)}>
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
              <Label htmlFor="p-sort">Display order</Label>
              <Input
                id="p-sort"
                inputMode="numeric"
                value={String(draft.sort_order)}
                onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
              />
            </div>
          </section>
          {!isNew && draft.handle && (
            <Button variant="outline" className="w-full rounded-full" asChild>
              <Link to="/product/$handle" params={{ handle: draft.handle }} target="_blank">
                View in shop
              </Link>
            </Button>
          )}
        </aside>
      </div>

      {(dirty || isNew) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-navy text-navy-foreground">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <span className="text-sm font-semibold">
              {isNew ? "New product" : "Unsaved changes"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-navy-foreground hover:bg-navy-foreground/10"
              onClick={() => setConfirm("discard")}
            >
              Discard
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              disabled={!draft.title || save.isPending}
              onClick={() => setConfirm("save")}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm === "save"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={isNew ? "Publish this product?" : "Save these changes?"}
        description="The shop updates straight away."
        confirmLabel="Yes, save"
        loading={save.isPending}
        onConfirm={() => save.mutate(draft)}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Discard your changes?"
        description="Anything you haven't saved will be lost."
        confirmLabel="Yes, discard"
        destructive
        onConfirm={() => navigate({ to: "/admin/products" })}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete “${draft.title}”?`}
        description="It will disappear from the shop immediately. This cannot be undone."
        confirmLabel="Yes, delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
