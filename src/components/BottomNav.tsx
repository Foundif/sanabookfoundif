import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, ShoppingCart, Store, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useCartStore } from "@/stores/cartStore";
import { useCartUi } from "@/stores/cartUiStore";

const itemClass = (active: boolean) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
    active ? "text-primary" : "text-muted-foreground"
  }`;

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 text-[9px] font-bold text-saffron-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** App-style 5-tab bottom navigation, shown on mobile only. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { user } = useAuth();
  const wishlist = useWishlist();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const openCart = useCartUi((s) => s.openCart);

  const onAccount = pathname.startsWith("/account") || pathname === "/auth";
  const onWishlistTab = pathname.startsWith("/account") && search?.["tab"] === "wishlist";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link to="/" className={itemClass(pathname === "/")} aria-label="Home">
        <Home className="h-5 w-5" />
        Home
      </Link>

      <Link to="/shop" className={itemClass(pathname.startsWith("/shop"))} aria-label="Shop">
        <Store className="h-5 w-5" />
        Shop
      </Link>

      <Link
        to={user ? "/account" : "/auth"}
        search={user ? { tab: "wishlist" } : {}}
        className={itemClass(onWishlistTab)}
        aria-label="Wishlist"
      >
        <span className="relative">
          <Heart className="h-5 w-5" />
          <NavBadge count={wishlist.count} />
        </span>
        Wishlist
      </Link>

      <button type="button" onClick={openCart} className={itemClass(false)} aria-label="Open cart">
        <span className="relative">
          <ShoppingCart className="h-5 w-5" />
          <NavBadge count={cartCount} />
        </span>
        Cart
      </button>

      <Link
        to={user ? "/account" : "/auth"}
        className={itemClass(onAccount && !onWishlistTab)}
        aria-label="Profile"
      >
        <User className="h-5 w-5" />
        Profile
      </Link>
    </nav>
  );
}
