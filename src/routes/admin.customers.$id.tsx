import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { deleteCustomer, getCustomerAccount } from "@/lib/customers.functions";
import { formatINR } from "@/lib/catalog";
import type { OrderRow } from "@/lib/orders";

export const Route = createFileRoute("/admin/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  // 1. Fetch Profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["admin", "customer", id, "profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  // 2. Fetch Auth Account info (email, last sign in)
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ["admin", "customer", id, "account"],
    queryFn: () => getCustomerAccount({ data: { userId: id } }),
  });

  // 3. Fetch Orders & Order Items
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin", "customer", id, "orders", account?.email],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (account?.email) {
        query = query.or(`user_id.eq.${id},email.eq.${account.email}`);
      } else {
        query = query.eq("user_id", id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as (OrderRow & { order_items: any[] })[];
    },
  });

  // 4. Fetch Saved Addresses
  const { data: addresses = [] } = useQuery({
    queryKey: ["admin", "customer", id, "addresses"],
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").eq("user_id", id);
      return data ?? [];
    },
  });

  // 5. Fetch Wishlist Items
  const { data: wishlist = [] } = useQuery({
    queryKey: ["admin", "customer", id, "wishlist"],
    queryFn: async () => {
      const { data } = await supabase.from("wishlist_items").select("*").eq("user_id", id);
      return data ?? [];
    },
  });

  // 6. Delete Customer Mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer({ data: { userId: id } }),
    onSuccess: () => {
      toast.success("Customer account deleted successfully.");
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
      navigate({ to: "/admin/customers" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete customer");
    },
  });

  const totalSpend = orders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const purchasedBooks = orders.flatMap((o) => o.order_items || []);

  if (loadingProfile || loadingOrders || loadingAccount) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  const displayName = profile?.display_name || orders[0]?.full_name || "Customer";
  const displayEmail = account?.email || orders[0]?.email || "No email on record";
  const displayPhone = profile?.phone || orders[0]?.phone || "No phone";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/customers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="text-xs text-muted-foreground">User ID: {id}</p>
          </div>
        </div>

        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete Account
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Lifetime Spend</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatINR(totalSpend)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{orders.length} total orders</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Contact Info</p>
          <div className="mt-2 space-y-1 text-xs text-foreground">
            <p className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {displayEmail}
            </p>
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {displayPhone}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Child Profile</p>
          {profile?.child_name ? (
            <div className="mt-2 text-xs">
              <p className="font-semibold">{profile.child_name}</p>
              <p className="text-muted-foreground">
                {profile.child_age ? `${profile.child_age} years old` : "Age not specified"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No child profile registered</p>
          )}
        </div>
      </div>

      {/* Purchase History */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <ShoppingBag className="h-4 w-4 text-primary" /> Purchase History ({orders.length})
        </h2>
        <div className="mt-4 divide-y divide-border">
          {orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders placed yet.</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground">
                    Order #{o.order_number || o.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {o.payment_method?.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{o.status}</Badge>
                  <span className="font-bold">{formatINR(o.total)}</span>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/admin/orders/$id" params={{ id: o.id }}>
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Purchased Items List */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <BookOpen className="h-4 w-4 text-primary" /> Purchased Items ({purchasedBooks.length})
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {purchasedBooks.length === 0 ? (
            <p className="col-span-2 py-4 text-center text-sm text-muted-foreground">No items recorded.</p>
          ) : (
            purchasedBooks.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 text-xs"
              >
                <span className="truncate font-medium">{item.product_title}</span>
                <span className="text-muted-foreground">
                  Qty: {item.quantity} · {formatINR(item.unit_price)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Addresses & Wishlist */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Saved Addresses ({addresses.length})
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {addresses.length === 0 ? (
              <p className="text-muted-foreground">No saved addresses.</p>
            ) : (
              addresses.map((a: any) => (
                <div key={a.id} className="rounded-lg border border-border/70 p-2.5">
                  <p className="font-semibold">
                    {a.full_name} ({a.label})
                  </p>
                  <p className="text-muted-foreground">
                    {a.address_line1}, {a.city}, {a.state} - {a.pincode}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Heart className="h-4 w-4 text-saffron" /> Wishlist Items ({wishlist.length})
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {wishlist.length === 0 ? (
              <p className="text-muted-foreground">Wishlist is empty.</p>
            ) : (
              wishlist.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 p-2.5"
                >
                  <span className="font-semibold">Handle: {w.product_handle}</span>
                  <span className="text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Customer Account?"
        description="This will permanently delete this customer's profile, saved addresses, and wishlist. Their previous orders will remain for accounting records. This cannot be undone."
        confirmLabel="Yes, Delete Customer"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
