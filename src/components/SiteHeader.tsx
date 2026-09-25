import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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

const NOTICES = [
  "Free shipping over ₹499",
  "Cash on delivery available",
  "Up to 25% off bundles",
  "GST invoicing on every order",
];

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface">
      {/* Top Notice Marquee */}
      <div className="group overflow-hidden bg-navy text-navy-foreground">
        <div className="flex w-max animate-marquee items-center py-1.5 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center gap-4 pr-4">
              {NOTICES.map((notice, i) => (
                <span key={i} className="flex items-center gap-3 text-xs font-medium tracking-wide whitespace-nowrap">
                  {notice}
                  <span className="text-navy-foreground/40">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

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
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-secondary/80 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none"
                >
                  <Sparkles className="h-3.5 w-3.5 text-saffron" />
                  Categories & Bundles
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[520px] p-4 shadow-xl">
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Shop by Category
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2" />
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem
                      key={cat}
                      onClick={() => navigate({ to: "/shop", search: { category: cat } })}
                      className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-secondary focus:bg-secondary"
                    >
                      {cat}
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
                className="text-xs font-semibold text-foreground/85 transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search bar */}
          <form
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 md:flex"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                navigate({ to: "/shop", search: { q: query.trim() } });
              }
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books, phonics, bundles..."
                aria-label="Search books"
                className="h-9 rounded-full bg-secondary/80 pl-9 text-xs focus:bg-surface"
              />
            </div>
          </form>

          {/* Action Icons */}
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Button variant="ghost" size="icon" aria-label={user ? "Your account" : "Sign in"} asChild>
              <Link to={user ? "/account" : "/auth"}>
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Your wishlist" asChild>
              <Link to={user ? "/account" : "/auth"} search={user ? { tab: "wishlist" } : {}} className="relative">
                <Heart className="h-4 w-4" />
                {wishlist.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-saffron px-1 text-[10px] font-bold text-saffron-foreground">
                    {wishlist.count}
                  </span>
                )}
              </Link>
            </Button>
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
