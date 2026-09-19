import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  deleteCoupon,
  emptyCoupon,
  fetchCoupons,
  saveCoupon,
  type CouponInput,
  type CouponRow,
} from "@/lib/admin";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

type Draft = CouponInput & { id?: string };

function dateValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function AdminCoupons() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CouponRow | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "coupons"], queryFn: fetchCoupons });

  const save = useMutation({
    mutationFn: (input: Draft) => saveCoupon(input),
    onSuccess: async () => {
      toast.success("Coupon saved — shoppers can use it at checkout");
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save this coupon"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: async () => {
      toast.success("Coupon deleted");
      setConfirmDelete(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => toast.error("Could not delete this coupon"),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  const coupons = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Codes here can be redeemed in the basket and at checkout.
        </p>
        <Button className="rounded-full" onClick={() => setDraft({ ...emptyCoupon })}>
          <Plus className="mr-1 h-4 w-4" /> New coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          No coupons yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {coupons.map((c) => (
            <article key={c.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold tracking-wide">{c.code}</p>
                  <p className="text-xs text-muted-foreground">{c.description || "No note"}</p>
                </div>
                <Badge variant={c.active ? "secondary" : "outline"}>
                  {c.active ? "Live" : "Paused"}
                </Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-semibold">
                    {c.discount_type === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`}
                    {c.max_discount ? ` · max ${formatINR(c.max_discount)}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Minimum basket</dt>
                  <dd className="font-semibold">
                    {c.min_subtotal ? formatINR(c.min_subtotal) : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Used</dt>
                  <dd className="font-semibold">
                    {c.times_used}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Free shipping</dt>
                  <dd className="font-semibold">{c.free_shipping ? "Yes" : "No"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      code: c.code,
                      description: c.description,
                      discount_type: c.discount_type,
                      value: c.value,
                      min_subtotal: c.min_subtotal,
                      max_discount: c.max_discount,
                      starts_at: c.starts_at,
                      ends_at: c.ends_at,
                      usage_limit: c.usage_limit,
                      free_shipping: c.free_shipping,
                      active: c.active,
                    })
                  }
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setConfirmDelete(c)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit coupon" : "New coupon"}</DialogTitle>
            <DialogDescription>
              Shoppers type the code in the basket or on the checkout page.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="c-code">Code</Label>
                <Input
                  id="c-code"
                  value={draft.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select
                  value={draft.discount_type}
                  onValueChange={(v) => set("discount_type", v as "percent" | "flat")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="flat">Flat amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="c-desc">Shopper-facing note</Label>
                <Input
                  id="c-desc"
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="10% off your first order"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-value">
                  {draft.discount_type === "percent" ? "Percent" : "Amount (₹)"}
                </Label>
                <Input
                  id="c-value"
                  inputMode="decimal"
                  value={String(draft.value)}
                  onChange={(e) => set("value", Number(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-max">Maximum discount (₹)</Label>
                <Input
                  id="c-max"
                  inputMode="decimal"
                  value={draft.max_discount == null ? "" : String(draft.max_discount)}
                  onChange={(e) =>
                    set("max_discount", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="optional"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-min">Minimum basket (₹)</Label>
                <Input
                  id="c-min"
                  inputMode="decimal"
                  value={String(draft.min_subtotal)}
                  onChange={(e) => set("min_subtotal", Number(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-limit">Total uses allowed</Label>
                <Input
                  id="c-limit"
                  inputMode="numeric"
                  value={draft.usage_limit == null ? "" : String(draft.usage_limit)}
                  onChange={(e) =>
                    set("usage_limit", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="unlimited"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-start">Starts</Label>
                <Input
                  id="c-start"
                  type="date"
                  value={dateValue(draft.starts_at)}
                  onChange={(e) =>
                    set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-end">Ends</Label>
                <Input
                  id="c-end"
                  type="date"
                  value={dateValue(draft.ends_at)}
                  onChange={(e) =>
                    set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="c-ship"
                  checked={draft.free_shipping}
                  onCheckedChange={(v) => set("free_shipping", v)}
                />
                <Label htmlFor="c-ship">Also free shipping</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="c-active"
                  checked={draft.active}
                  onCheckedChange={(v) => set("active", v)}
                />
                <Label htmlFor="c-active">Live</Label>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={!draft?.code || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              Save coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Shoppers will no longer be able to redeem this code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
