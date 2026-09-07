import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyOrders, ORDER_STATUSES } from "@/lib/orders";
import { fetchMyReviews } from "@/lib/reviews";
import {
  INTEREST_OPTIONS,
  type AddressInput,
  type AccountProfile,
  deleteAddress,
  fetchAccountProfile,
  fetchAddresses,
  fetchWishlist,
  removeFromWishlist,
  saveAccountProfile,
  saveAddress,
} from "@/lib/account";
import { allProducts, formatINR } from "@/lib/catalog";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "My orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payments", label: "Payment methods", icon: CreditCard },
  { id: "child", label: "Child profile", icon: Sparkles },
  { id: "communication", label: "Communication", icon: Mail },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabId } => {
    const tab = String(search["tab"] ?? "");
    return TABS.some((t) => t.id === tab) ? { tab: tab as TabId } : {};
  },
  head: () => ({
    meta: [
      { title: "My account — Sanabooks India" },
      {
        name: "description",
        content:
          "Your Sanabooks India account: orders, wishlist, saved addresses, payment preferences, your child's reading profile and email preferences.",
      },
      { property: "og:title", content: "My account — Sanabooks India" },
      {
        property: "og:description",
        content: "Track orders, manage addresses and tune book picks for your reader.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const tab: TabId = search.tab ?? "dashboard";

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const profileQuery = useQuery({
    queryKey: ["account-profile", user?.id],
    queryFn: () => fetchAccountProfile(user!.id),
    enabled: !!user,
  });
  const ordersQuery = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: fetchMyOrders,
    enabled: !!user,
  });
  const wishlistQuery = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: fetchWishlist,
    enabled: !!user,
  });
  const addressQuery = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: fetchAddresses,
    enabled: !!user,
  });
  const reviewsQuery = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: () => fetchMyReviews(user!.id),
    enabled: !!user,
  });

  const saveProfile = useMutation({
    mutationFn: (patch: Partial<Omit<AccountProfile, "id">>) =>
      saveAccountProfile(user!.id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-profile", user?.id] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const profile = profileQuery.data;
  const orders = ordersQuery.data ?? [];
  const wishlist = wishlistQuery.data ?? [];
  const addresses = addressQuery.data ?? [];
  const reviews = reviewsQuery.data ?? [];
  const displayName =
    profile?.display_name ??
    (user.user_metadata?.["display_name"] as string | undefined) ??
    user.email?.split("@")[0] ??
    "reader";
  const booksRead = orders.reduce(
    (n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0),
    0,
  );
  const saved = orders.reduce((n, o) => n + Number(o.shipping_fee === 0 ? 49 : 0), 0);

  return (
    <div className="bg-cream/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          / <span className="font-semibold text-foreground">My account</span>
        </nav>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hi {displayName} 👋</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* sidebar */}
          <aside className="h-max rounded-2xl border border-border bg-card p-3 shadow-shelf lg:sticky lg:top-28">
            <div className="flex items-center gap-3 px-2 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="mt-2 grid gap-1">
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  to="/account"
                  search={{ tab: t.id }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => void handleSignOut()}
              className="mt-3 flex w-full items-center gap-2 border-t border-border px-3 pt-3 text-sm font-semibold text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>

          <div className="min-w-0">
            {tab === "dashboard" && (
              <DashboardTab
                orders={orders}
                booksRead={booksRead}
                saved={saved}
                profile={profile ?? null}
                reviewCount={reviews.length}
                loading={ordersQuery.isLoading}
              />
            )}
            {tab === "orders" && (
              <OrdersTab orders={orders} loading={ordersQuery.isLoading} />
            )}
            {tab === "wishlist" && (
              <WishlistTab
                items={wishlist}
                loading={wishlistQuery.isLoading}
                userId={user.id}
                onChange={() =>
                  void queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] })
                }
              />
            )}
            {tab === "addresses" && (
              <AddressesTab
                addresses={addresses}
                loading={addressQuery.isLoading}
                userId={user.id}
                onChange={() =>
                  void queryClient.invalidateQueries({ queryKey: ["addresses", user.id] })
                }
              />
            )}
            {tab === "payments" && (
              <PaymentsTab
                profile={profile ?? null}
                onSave={(patch) => saveProfile.mutate(patch)}
                saving={saveProfile.isPending}
              />
            )}
            {tab === "child" && (
              <ChildTab
                profile={profile ?? null}
                onSave={(patch) => saveProfile.mutate(patch)}
                saving={saveProfile.isPending}
              />
            )}
            {tab === "communication" && (
              <CommunicationTab
                profile={profile ?? null}
                onSave={(patch) => saveProfile.mutate(patch)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Orders = Awaited<ReturnType<typeof fetchMyOrders>>;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 shadow-shelf ${className}`}>
      {children}
    </section>
  );
}

function statusTone(status: string) {
  if (status === "delivered") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "placed") return "bg-secondary text-foreground";
  return "bg-saffron/20 text-saffron-foreground";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusTone(status)}`}
    >
      {status}
    </span>
  );
}

function DashboardTab({
  orders,
  booksRead,
  saved,
  profile,
  reviewCount,
  loading,
}: {
  orders: Orders;
  booksRead: number;
  saved: number;
  profile: AccountProfile | null;
  reviewCount: number;
  loading: boolean;
}) {
  const recent = orders[0];
  const picks = pickForChild(profile);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total orders", value: String(orders.length) },
          { label: "Books read", value: String(booksRead) },
          { label: "You've saved", value: formatINR(String(saved)) },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent order</h2>
          <Link
            to="/account"
            search={{ tab: "orders" }}
            className="text-sm font-semibold text-primary"
          >
            View all →
          </Link>
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-20 rounded-xl" />
        ) : !recent ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link to="/shop" className="font-semibold text-primary">
              Browse the library
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {recent.items[0]?.image_url && (
              <img
                src={recent.items[0].image_url}
                alt=""
                loading="lazy"
                className="h-20 w-16 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {recent.items[0]?.product_title ?? "Order"}
                {recent.items.length > 1 && ` · +${recent.items.length - 1} more`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Order #{recent.order_number} · {formatINR(String(recent.total))} · placed{" "}
                {new Date(recent.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <StatusPill status={recent.status} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold">
          Picked for {profile?.child_name ?? "your reader"}
          {profile?.child_age ? ` (age ${profile.child_age})` : ""}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((p) => (
            <ProductCard key={p.node.handle} product={p} />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Your reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You have written {reviewCount} review{reviewCount === 1 ? "" : "s"}.{" "}
          <Link to="/shop" className="font-semibold text-primary">
            Review another book
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}

function pickForChild(profile: AccountProfile | null) {
  const all = allProducts();
  const age = profile?.child_age;
  const tag =
    age == null
      ? null
      : age <= 2
        ? "age-0-2"
        : age <= 5
          ? "age-3-5"
          : age <= 8
            ? "age-6-8"
            : "age-9-12";
  const matched = tag ? all.filter((p) => p.node.tags.includes(tag)) : [];
  return (matched.length >= 3 ? matched : all).slice(0, 3);
}

function OrdersTab({ orders, loading }: { orders: Orders; loading: boolean }) {
  if (loading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!orders.length)
    return (
      <Card>
        <h2 className="text-lg font-bold">My orders</h2>
        <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You have not placed an order yet.{" "}
          <Link to="/shop" className="font-semibold text-primary">
            Start shopping
          </Link>
          .
        </p>
      </Card>
    );

  return (
    <div className="grid gap-4">
      {orders.map((o) => {
        const step = ORDER_STATUSES.indexOf(o.status as (typeof ORDER_STATUSES)[number]);
        return (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Order #{o.order_number}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Placed{" "}
                  {new Date(o.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {o.payment_method.toUpperCase()} · {o.shipping_method}
                </p>
              </div>
              <StatusPill status={o.status} />
            </div>

            {o.status !== "cancelled" && (
              <div className="mt-4 flex gap-1">
                {ORDER_STATUSES.slice(0, 4).map((s, i) => (
                  <div key={s} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
                    />
                    <p className="mt-1.5 text-[11px] capitalize text-muted-foreground">{s}</p>
                  </div>
                ))}
              </div>
            )}

            <ul className="mt-5 grid gap-3">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  {i.image_url && (
                    <img
                      src={i.image_url}
                      alt=""
                      loading="lazy"
                      className="h-16 w-12 rounded-md object-cover"
                    />
                  )}
                  <Link
                    to="/product/$handle"
                    params={{ handle: i.product_handle }}
                    className="min-w-0 flex-1 text-sm font-semibold hover:text-primary"
                  >
                    {i.product_title}
                  </Link>
                  <span className="text-xs text-muted-foreground">× {i.quantity}</span>
                  <span className="text-sm font-bold">{formatINR(String(i.unit_price))}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">
                Ships to {o.city}, {o.state} {o.pincode ?? ""}
              </span>
              <span className="font-bold">Total {formatINR(String(o.total))}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function WishlistTab({
  items,
  loading,
  userId,
  onChange,
}: {
  items: { id: string; product_handle: string; product_title: string | null; image_url: string | null }[];
  loading: boolean;
  userId: string;
  onChange: () => void;
}) {
  const remove = async (handle: string) => {
    try {
      await removeFromWishlist(userId, handle);
      toast.success("Removed from wishlist");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  };

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <Card>
      <h2 className="text-lg font-bold">Wishlist</h2>
      {!items.length ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing saved yet. Tap the heart on any book to keep it here.{" "}
          <Link to="/shop" className="font-semibold text-primary">
            Browse books
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {items.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-4 rounded-xl border border-border p-3"
            >
              {w.image_url && (
                <img
                  src={w.image_url}
                  alt=""
                  loading="lazy"
                  className="h-20 w-16 rounded-md object-cover"
                />
              )}
              <Link
                to="/product/$handle"
                params={{ handle: w.product_handle }}
                className="min-w-0 flex-1 text-sm font-bold hover:text-primary"
              >
                {w.product_title ?? w.product_handle}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove"
                onClick={() => void remove(w.product_handle)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const EMPTY_ADDRESS: AddressInput = {
  label: "Home",
  full_name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

function AddressesTab({
  addresses,
  loading,
  userId,
  onChange,
}: {
  addresses: (AddressInput & { id: string })[];
  loading: boolean;
  userId: string;
  onChange: () => void;
}) {
  const [form, setForm] = useState<AddressInput | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!/^\d{6}$/.test(form.pincode)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      await saveAddress(userId, form, editing ?? undefined);
      toast.success(editing ? "Address updated" : "Address saved");
      setForm(null);
      setEditing(null);
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAddress(id);
      toast.success("Address deleted");
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Saved addresses</h2>
          {!form && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setEditing(null);
                setForm({ ...EMPTY_ADDRESS, is_default: addresses.length === 0 });
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add address
            </Button>
          )}
        </div>

        {!addresses.length && !form && (
          <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No addresses saved. Add one for faster checkout.
          </p>
        )}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wide uppercase text-primary">
                  {a.label}
                </span>
                {a.is_default && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-bold">{a.full_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {a.address}, {a.city}, {a.state} — {a.pincode}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{a.phone}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    const { id, ...rest } = a;
                    setEditing(id);
                    setForm(rest);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-destructive"
                  onClick={() => void remove(a.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {form && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{editing ? "Edit address" : "New address"}</h3>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cancel"
              onClick={() => {
                setForm(null);
                setEditing(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            {(
              [
                ["label", "Label (Home / Office)"],
                ["full_name", "Full name"],
                ["phone", "Mobile number"],
                ["pincode", "Pincode"],
                ["city", "City"],
                ["state", "State"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  required
                  value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Flat, building, street, area</Label>
              <Input
                id="address"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
              Use as my default delivery address
            </label>
            <Button type="submit" className="rounded-full sm:col-span-2" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save address
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

const PAYMENT_METHODS = [
  { id: "upi", title: "UPI", note: "GPay, PhonePe, Paytm — instant confirmation" },
  { id: "card", title: "Card", note: "Visa, Mastercard, RuPay — 3D secure" },
  { id: "netbanking", title: "Net banking", note: "All major Indian banks" },
  { id: "cod", title: "Cash on delivery", note: "₹29 handling fee, pay the courier" },
] as const;

function PaymentsTab({
  profile,
  onSave,
  saving,
}: {
  profile: AccountProfile | null;
  onSave: (patch: Partial<Omit<AccountProfile, "id">>) => void;
  saving: boolean;
}) {
  const [method, setMethod] = useState(profile?.preferred_payment ?? "upi");
  const [upi, setUpi] = useState(profile?.upi_id ?? "");

  useEffect(() => {
    if (profile) {
      setMethod(profile.preferred_payment ?? "upi");
      setUpi(profile.upi_id ?? "");
    }
  }, [profile]);

  return (
    <Card>
      <h2 className="text-lg font-bold">Payment methods</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick how you usually pay — we preselect it at checkout. We never store card numbers; they
        are handled by our payment partner.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              method === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
            }`}
          >
            <p className="text-sm font-bold">{m.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
          </button>
        ))}
      </div>

      {method === "upi" && (
        <div className="mt-5 grid max-w-sm gap-1.5">
          <Label htmlFor="upi">Your UPI ID (optional)</Label>
          <Input
            id="upi"
            placeholder="name@bank"
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
          />
        </div>
      )}

      <Button
        className="mt-6 rounded-full"
        disabled={saving}
        onClick={() => onSave({ preferred_payment: method, upi_id: upi.trim() || null })}
      >
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save preference
      </Button>
    </Card>
  );
}

function ChildTab({
  profile,
  onSave,
  saving,
}: {
  profile: AccountProfile | null;
  onSave: (patch: Partial<Omit<AccountProfile, "id">>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(profile?.child_name ?? "");
  const [age, setAge] = useState(profile?.child_age ? String(profile.child_age) : "");
  const [interests, setInterests] = useState<string[]>(profile?.child_interests ?? []);

  useEffect(() => {
    if (profile) {
      setName(profile.child_name ?? "");
      setAge(profile.child_age ? String(profile.child_age) : "");
      setInterests(profile.child_interests ?? []);
    }
  }, [profile]);

  const toggle = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <Card>
      <h2 className="text-lg font-bold">Your child's profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Help us pick better books — tell us about your reader.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="child-name">Name</Label>
          <Input
            id="child-name"
            value={name}
            placeholder="Aanya"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="child-age">Age</Label>
          <Input
            id="child-age"
            type="number"
            min={0}
            max={18}
            value={age}
            placeholder="5"
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
      </div>

      <p className="mt-6 eyebrow">Loves</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((i) => {
          const on = interests.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                on
                  ? "border-navy bg-navy text-navy-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {i} {on ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      <Button
        className="mt-6 rounded-full"
        disabled={saving}
        onClick={() =>
          onSave({
            child_name: name.trim() || null,
            child_age: age ? Number(age) : null,
            child_interests: interests,
          })
        }
      >
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save reader profile
      </Button>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 text-saffron" /> Your dashboard picks update from this age.
      </p>
    </Card>
  );
}

const COMMS = [
  ["notify_picks", "Monthly book picks"],
  ["notify_launches", "New launch alerts"],
  ["notify_orders", "Order updates"],
  ["notify_digest", "Reading room digest"],
] as const;

function CommunicationTab({
  profile,
  onSave,
}: {
  profile: AccountProfile | null;
  onSave: (patch: Partial<Omit<AccountProfile, "id">>) => void;
}) {
  return (
    <Card>
      <h2 className="text-lg font-bold">Communication</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose what lands in your inbox. Order updates keep you posted on deliveries.
      </p>
      <ul className="mt-5 divide-y divide-border">
        {COMMS.map(([key, label]) => (
          <li key={key} className="flex items-center justify-between py-4">
            <span className="text-sm font-semibold">{label}</span>
            <Switch
              checked={profile ? Boolean(profile[key]) : false}
              onCheckedChange={(v) => onSave({ [key]: v })}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
