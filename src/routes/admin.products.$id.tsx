import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, ImagePlus, Loader2, Plus, Sparkles, Star, Trash2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  deleteProduct,
  emptyProduct,
  fetchAdminProduct,
  saveProductReturningId,
  uploadProductImage,
  uploadProductVideo,
  type ProductInput,
  type ProductVariantItem,
  uploadVariantImage,
} from "@/lib/cms";

const variantImages = (v?: { images?: string[]; image_url?: string | null } | null): string[] =>
  v ? (v.images && v.images.length ? v.images.filter(Boolean) : v.image_url ? [v.image_url] : []) : [];
import { AGE_GROUPS, CATEGORIES, invalidateProductCache } from "@/lib/catalog";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB strict
const MAX_GALLERY_IMAGES = 5; // Max 5 gallery photos

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
  const variantFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [activeVariantUploadIdx, setActiveVariantUploadIdx] = useState<number | null>(null);

  const [draft, setDraft] = useState<Draft | null>(
    isNew ? { ...emptyProduct, stock: 0, low_stock_threshold: 5 } : null,
  );
  const [original, setOriginal] = useState<string>("");
  const [tagText, setTagText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingVariant, setUploadingVariant] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [confirm, setConfirm] = useState<null | "save" | "delete" | "discard">(null);

  // New variant helper states
  const [newVarTitle, setNewVarTitle] = useState("");
  const [newVarPrice, setNewVarPrice] = useState("");
  const [newVarImage, setNewVarImage] = useState<string | null>(null);

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
      gift_wrap_price: data.gift_wrap_price ?? 0,
      video_url: data.video_url ?? null,
    };
    setDraft(d);
    setOriginal(JSON.stringify(d));
    setTagText((d.tags ?? []).join(", "));
  }, [data, isNew]);

  const dirty = !!draft && JSON.stringify(draft) !== original;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  /** Gallery: primary cover first, then extras. */
  const gallery = draft ? [...new Set([...(draft.image_url ? [draft.image_url] : []), ...(draft.images ?? [])])] : [];
  const setGallery = (list: string[]) => {
    const limited = list.slice(0, MAX_GALLERY_IMAGES);
    setDraft((d) => (d ? { ...d, image_url: limited[0] ?? null, images: limited.slice(1) } : d));
  };

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

  // Upload main gallery photos with strict count and size limit
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remainingSlots = MAX_GALLERY_IMAGES - gallery.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum limit reached: only ${MAX_GALLERY_IMAGES} photos allowed per product.`);
      return;
    }

    setUploading(true);
    try {
      const urls: string[] = [];
      const selectedFiles = Array.from(files).slice(0, remainingSlots);

      if (files.length > remainingSlots) {
        toast.info(`Only adding ${remainingSlots} photo(s) to stay within the ${MAX_GALLERY_IMAGES}-photo limit.`);
      }

      for (const f of selectedFiles) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(`"${f.name}" is larger than 2 MB. Please upload images under 2 MB.`);
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

  // Upload variation image: up to 3 photos per variation, auto-compressed
  const onVariantFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES * 5) {
      toast.error(`Variation image must be under 10 MB.`);
      if (variantFileRef.current) variantFileRef.current.value = "";
      return;
    }

    setUploadingVariant(true);
    try {
      const url = await uploadVariantImage(file);
      if (activeVariantUploadIdx !== null) {
        const current = draft?.variants?.[activeVariantUploadIdx];
        const imgs = [...variantImages(current), url].slice(0, 3);
        updateVariant(activeVariantUploadIdx, { images: imgs, image_url: imgs[0] ?? null });
        toast.success("Variation photo added");
      } else {
        setNewVarImage(url);
        toast.success("Variation photo uploaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload variation image");
    } finally {
      setUploadingVariant(false);
      setActiveVariantUploadIdx(null);
      if (variantFileRef.current) variantFileRef.current.value = "";
    }
  };

  // Upload single product video (max 15 MB)
  const onVideoFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("video/")) {
      toast.error("Please select a valid MP4 or WebM video file.");
      return;
    }

    if (draft?.video_url) {
      toast.error("Product already has 1 video. Remove the current video before uploading another.");
      return;
    }

    setUploadingVideo(true);
    try {
      const url = await uploadProductVideo(file);
      set("video_url", url);
      toast.success("Product video uploaded (1/1)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload video");
    } finally {
      setUploadingVideo(false);
      if (videoFileRef.current) videoFileRef.current.value = "";
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
      image_url: newVarImage,
      images: newVarImage ? [newVarImage] : [],
    };
    const updated = [...(draft?.variants ?? []), newVariant];
    set("variants", updated);
    setNewVarTitle("");
    setNewVarPrice("");
    setNewVarImage(null);
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
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 pb-28">
      {/* Top action header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isNew ? "Add New Book" : draft.title || "Edit Book"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isNew ? "Publish a new title to the library" : `Handle: /product/${draft.handle}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirm("delete")}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => setConfirm("save")}
            className="shadow-sm font-semibold"
          >
            {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Hidden file inputs with size & count safety */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <input
        ref={variantFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onVariantFile(e.target.files)}
      />
      <input
        ref={videoFileRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => onVideoFile(e.target.files)}
      />

      {/* TWO-COLUMN SHOPIFY-STYLE LAYOUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ================= LEFT MAIN COLUMN (8 cols) ================= */}
        <div className="space-y-6 lg:col-span-8">
          {/* Basic Details */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Basic Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    set("title", title);
                    if (isNew) set("handle", slugify(title));
                  }}
                  placeholder="e.g. 201 Activity Book for Kids"
                  className="mt-1.5 font-medium"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="handle">URL Handle *</Label>
                  <Input
                    id="handle"
                    value={draft.handle}
                    onChange={(e) => set("handle", slugify(e.target.value))}
                    className="mt-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="badge">Badge Pill (Optional)</Label>
                  <Input
                    id="badge"
                    value={draft.badge ?? ""}
                    onChange={(e) => set("badge", e.target.value || null)}
                    placeholder="e.g. Best Seller, New, 20% Off"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Product Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the content, age recommendations, and paper quality..."
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Product Variations (Strictly 1 Photo per Variation) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Product Variations & Options
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  1 photo per variation (max 2 MB). Click photo thumbnail to upload.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={quickPopulatePages}
                  className="h-7 text-[11px]"
                >
                  <Sparkles className="mr-1 h-3 w-3" /> + Pages
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={quickPopulateAges}
                  className="h-7 text-[11px]"
                >
                  <Sparkles className="mr-1 h-3 w-3" /> + Ages
                </Button>
              </div>
            </div>

            {/* Existing Variations Table */}
            {draft.variants && draft.variants.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/60 text-muted-foreground">
                      <tr>
                        <th className="p-2.5 w-36">Photos (max 3)</th>
                        <th className="p-2.5 min-w-[140px]">Variation Name</th>
                        <th className="p-2.5 w-24">Price (₹)</th>
                        <th className="p-2.5 w-24">Compare (₹)</th>
                        <th className="p-2.5 w-20">Stock</th>
                        <th className="p-2.5 w-10 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {draft.variants.map((v, i) => (
                        <tr key={v.id || i} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              {variantImages(v).map((img, k) => (
                                <div
                                  key={img}
                                  className="relative h-9 w-9 shrink-0 rounded-lg border border-border bg-card overflow-hidden"
                                >
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const imgs = variantImages(v).filter((_, j) => j !== k);
                                      updateVariant(i, { images: imgs, image_url: imgs[0] ?? null });
                                    }}
                                    className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-background opacity-0 transition-opacity hover:opacity-100"
                                    title="Remove photo"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              {variantImages(v).length < 3 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveVariantUploadIdx(i);
                                    variantFileRef.current?.click();
                                  }}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground"
                                  title="Add photo (up to 3)"
                                >
                                  {uploadingVariant && activeVariantUploadIdx === i ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Camera className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 font-medium">
                            <Input
                              value={v.title}
                              onChange={(e) => updateVariant(i, { title: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <Input
                              type="number"
                              value={v.price}
                              onChange={(e) => updateVariant(i, { price: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs font-semibold"
                            />
                          </td>
                          <td className="p-2.5">
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
                          <td className="p-2.5">
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
                No custom variations added yet. The product will use the base price (₹{draft.price}) below.
              </div>
            )}

            {/* Add variant row */}
            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-secondary/30 p-3">
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">Photo</Label>
                <div className="relative h-9 w-9 rounded-lg border border-border bg-card overflow-hidden flex items-center justify-center">
                  {newVarImage ? (
                    <>
                      <img src={newVarImage} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewVarImage(null)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVariantUploadIdx(null);
                        variantFileRef.current?.click();
                      }}
                      className="h-full w-full flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Upload photo (max 2 MB)"
                    >
                      {uploadingVariant && activeVariantUploadIdx === null ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">Variation Name</Label>
                <Input
                  value={newVarTitle}
                  onChange={(e) => setNewVarTitle(e.target.value)}
                  placeholder="e.g. Red, Blue, or 64 Pages"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div className="w-24">
                <Label className="text-xs">Price (₹)</Label>
                <Input
                  type="number"
                  value={newVarPrice}
                  onChange={(e) => setNewVarPrice(e.target.value)}
                  placeholder={String(draft.price || 199)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <Button type="button" size="sm" onClick={addVariant} className="h-9 gap-1.5">
                <Plus className="h-4 w-4" /> Add Variation
              </Button>
            </div>
          </div>

          {/* Base Pricing, Gift Wrap & Stock */}
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
                  onChange={(e) => set("compare_at_price", e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="MRP (optional)"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="gift_wrap">Gift Wrap Charge (₹)</Label>
                <Input
                  id="gift_wrap"
                  type="number"
                  min={0}
                  step={1}
                  value={draft.gift_wrap_price ?? 0}
                  onChange={(e) => set("gift_wrap_price", parseFloat(e.target.value) || 0)}
                  placeholder="0 = Free Gift Wrap"
                  className="mt-1.5"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Set 0 for free wrap, or enter custom fee.</p>
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
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR COLUMN (4 cols) ================= */}
        <div className="space-y-6 lg:col-span-4">
          {/* Status & Visibility */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Status & Visibility
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active" className="font-semibold text-sm">
                  Live in Storefront
                </Label>
                <p className="text-xs text-muted-foreground">Visible to shoppers on sanabooks.in</p>
              </div>
              <Switch id="active" checked={draft.active} onCheckedChange={(val) => set("active", val)} />
            </div>
          </div>

          {/* Product Photos (Strictly Max 5 Photos & 2 MB Limit) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Photos ({gallery.length}/{MAX_GALLERY_IMAGES})
                </h2>
                <p className="text-[11px] text-muted-foreground">Max 2 MB per image</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || gallery.length >= MAX_GALLERY_IMAGES}
                onClick={() => fileRef.current?.click()}
                title={gallery.length >= MAX_GALLERY_IMAGES ? "Limit reached (max 5)" : "Upload photo"}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1.5 h-4 w-4" />
                )}
                {gallery.length >= MAX_GALLERY_IMAGES ? "Max 5" : "Upload"}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {gallery.map((url, i) => (
                <div
                  key={url}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    {i !== 0 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        title="Set as Cover"
                        onClick={() => {
                          const next = [url, ...gallery.filter((_, idx) => idx !== i)];
                          setGallery(next);
                        }}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-white/20"
                      title="Remove"
                      onClick={() => {
                        const next = gallery.filter((_, idx) => idx !== i);
                        setGallery(next);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {gallery.length === 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl p-4">
                No photos yet. Click Upload to add up to 5 book photos.
              </p>
            )}
          </div>

          {/* Product Video (Strictly 1 Video Only) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Product Video ({draft.video_url ? "1/1" : "0/1"})
                </h2>
                <p className="text-[11px] text-muted-foreground">Max 1 video per book</p>
              </div>
              {!draft.video_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingVideo}
                  onClick={() => videoFileRef.current?.click()}
                >
                  {uploadingVideo ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="mr-1.5 h-4 w-4" />
                  )}
                  Upload MP4
                </Button>
              )}
            </div>

            {draft.video_url ? (
              <div className="mt-3 space-y-2">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center">
                  {draft.video_url.includes("youtube.com") || draft.video_url.includes("youtu.be") ? (
                    <p className="text-xs text-muted-foreground">YouTube Video Linked</p>
                  ) : (
                    <video src={draft.video_url} controls className="h-full w-full object-cover" />
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 w-7"
                    title="Remove Video"
                    onClick={() => set("video_url", null)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{draft.video_url}</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <Label className="text-xs">Or paste YouTube / Video link:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://youtu.be/... or .mp4"
                    className="h-8 text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          set("video_url", val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val) {
                        set("video_url", val);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category & Tags Organization */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Organization</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={draft.product_type} onValueChange={(val) => set("product_type", val)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select category" />
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

              <div>
                <Label>Age Bracket</Label>
                <Select
                  value={draft.age_tag ?? "none"}
                  onValueChange={(val) => set("age_tag", val === "none" ? null : val)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select age bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {AGE_GROUPS.map((a) => (
                      <SelectItem key={a.tag} value={a.tag}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tagText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setTagText(text);
                    const parsed = text
                      .split(",")
                      .map((t) => t.trim().toLowerCase())
                      .filter(Boolean);
                    set("tags", parsed);
                  }}
                  placeholder="e.g. handwriting, phonics, coloring"
                  className="mt-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirm === "save"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Save Changes?"
        description="This will immediately update the live pricing, media, and inventory across sanabooks.in."
        confirmLabel="Yes, Save"
        onConfirm={() => draft && save.mutate(draft)}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this book?"
        description={`Are you sure you want to delete "${draft.title}"? This cannot be undone.`}
        confirmLabel="Yes, Delete"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
