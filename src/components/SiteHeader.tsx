import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Heart, Menu, Search, Sparkles, User } from "lucide-react";
import logo from "@/assets/sanabooks-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartButton } from "@/components/CartDrawer";
import { CATEGORIES } from "@/lib/shopify";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { DEFAULT_NOTICES, fetchSiteSettings } from "@/lib/settings";

const MAIN_NAV = [
  { label: "Shop All", to: "/shop" },
  { label: "By Age", to: "/age/$tag", params: { tag: "age-3-5" } },
  { label: "Reading Room", to: "/reading-room" },
  { label: "Schools", to: "/schools" },
  { label: "Help", to: "/faq" },
  { label: "About", to: "/about" },
];

export function SiteHeader() {
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const wishlist = useWishlist();
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });

   const notices = useMemo(() => {
    const list = settings?.header_notices?.filter((s) => typeof s === "string" && s.trim().length > 0);
    if (list && list.length > 0) return list;
    return Array.isArray(DEFAULT_NOTICES) && DEFAULT_NOTICES.length > 0
      ? DEFAULT_NOTICES
      : ["Free India Shipping on Orders Over ₹499"];
  }, [settings?.header_notices]);

  // Multiply notices per track so each half is wider than ultra-wide displays (eliminates blank gap & glitch)
  const repeatedNotices = useMemo(() => {
    const safeList = notices && notices.length > 0 ? notices : ["Free India Shipping on Orders Over ₹499"];
    const minItems = 12;
    const factor = Math.max(2, Math.ceil(minItems / safeList.length));
    const combined: string[] = [];
    for (let i = 0; i < factor; i++) {
      combined.push(...safeList);
    }
    return combined;
  }, [notices]);

  const showNotices = settings?.header_notice_enabled ?? true;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface">
      {/* Top Notice Marquee - Seamless Infinite Loop */}
      {showNotices && (
        <div className="group overflow-hidden bg-navy text-navy-foreground select-none">
          <div className="flex w-max animate-marquee items-center py-1.5 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[0, 1].map((dup) => (
              <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center gap-6 pr-6">
                {repeatedNotices.map((notice, i) => (
                  <span
                    key={`${dup}-${i}`}
                    className="flex shrink-0 items-center gap-3 text-xs font-medium tracking-wide whitespace-nowrap"
                  >
                    <span>{notice}</span>
                    <span className="text-navy-foreground/40">•</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className={`border-b border-border transition-shadow ${scrolled ? "shadow-shelf" : ""}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          {/* Mobile Sheet Trigger */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetTitle className="px-1 text-base">Browse Sanabooks India</SheetTitle>
              <nav className="mt-4 grid gap-1">
                {MAIN_NAV.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    params={(item as { params?: Record<string, string> }).params as never}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Categories & Bundles
                </div>
                {CATEGORIES.map((c) => (
                  <Link
                    key={c}
                    to="/shop"
                    search={{ category: c }}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {c}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src={logo} alt="Sanabooks India logo" className="h-9 w-9 rounded-full object-contain" />
            <span className="text-lg font-bold tracking-tight text-primary">Sanabooks India</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="ml-4 hidden items-center gap-5 lg:flex">
            {/* Mega Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 font-semibold text-primary hover:bg-primary/10">
                  <Sparkles className="h-4 w-4 text-saffron" />
                  Categories & Bundles
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-2">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                  Shop by Shelf
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="grid grid-cols-2 gap-1 py-1">
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem asChild key={cat}>
                      <Link
                        to="/shop"
                        search={{ category: cat }}
                        className="cursor-pointer text-xs font-medium hover:text-primary"
                      >
                        {cat}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {MAIN_NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                params={(item as { params?: Record<string, string> }).params as never}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                navigate({ to: "/shop", search: { q: query.trim() } });
              }
            }}
            className="relative ml-auto hidden max-w-xs flex-1 md:block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search books, phonics, bundles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-full pl-9 text-sm"
            />
          </form>

          {/* Right actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-1">
            <Link
              to={user ? "/account" : "/auth"}
              className="rounded-full p-2 text-foreground/80 hover:bg-secondary hover:text-foreground"
              aria-label={user ? "My account" : "Sign in"}
            >
              <User className="h-5 w-5" />
            </Link>

            <Link
              to="/account"
              search={{ tab: "wishlist" } as never}
              className="relative rounded-full p-2 text-foreground/80 hover:bg-secondary hover:text-foreground"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlist.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {wishlist.count}
                </span>
              )}
            </Link>

            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
