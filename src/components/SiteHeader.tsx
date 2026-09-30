// src/components/SiteHeader.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Heart,
  HelpCircle,
  Info,
  LayoutGrid,
  Mail,
  Menu,
  PackageSearch,
  Search,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
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

const MAIN_PAGES = [
  { label: "Shop All Books", to: "/shop", icon: ShoppingBag, desc: "Explore entire catalogue" },
  {
    label: "Track Your Order",
    to: "/track",
    icon: PackageSearch,
    desc: "Live courier & delivery status",
    highlight: true,
  },
  {
    label: "Shop by Age (3–5)",
    to: "/age/$tag",
    params: { tag: "age-3-5" },
    icon: Sparkles,
    desc: "Curated for growing toddlers",
  },
  { label: "Reading Room", to: "/reading-room", icon: BookOpen, desc: "Guides, blogs & tips" },
  { label: "For Schools & Bulk", to: "/schools", icon: GraduationCap, desc: "Curriculum & wholesale orders" },
  { label: "About Sanabooks", to: "/about", icon: Info, desc: "Our story & mission" },
  { label: "Help & FAQ", to: "/faq", icon: HelpCircle, desc: "Shipping, returns & queries" },
  { label: "Contact Us", to: "/contact", icon: Mail, desc: "Email & WhatsApp support" },
];

export function SiteHeader() {
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pages" | "categories">("pages");

  const { user } = useAuth();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const isShopPage = location.pathname === "/shop";

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
      {/* Top Notice Marquee */}
      {showNotices && (
        <div className="group overflow-hidden bg-navy text-navy-foreground select-none">
          <div
            className="flex w-max animate-marquee items-center py-1.5 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
            style={{ animationDuration: "55s" }}
          >
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
            <SheetContent side="left" className="flex w-84 flex-col p-0">
              {/* Drawer Header */}
              <div className="border-b border-border p-4">
                <SheetTitle className="flex items-center gap-2 text-base font-bold text-primary">
                  <img src={logo} alt="Sanabooks" className="h-7 w-7 rounded-full object-contain" />
                  Sanabooks India
                </SheetTitle>

                {/* Switchable Tabs */}
                <div className="mt-3 grid grid-cols-2 rounded-lg bg-secondary/80 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("pages")}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors ${
                      activeTab === "pages"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("categories")}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors ${
                      activeTab === "categories"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5 text-saffron" />
                    Categories
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-3">
                {activeTab === "pages" ? (
                  <nav className="grid gap-1">
                    {MAIN_PAGES.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.to}
                          params={(item as { params?: Record<string, string> }).params as never}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                            item.highlight
                              ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold"
                              : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-semibold">{item.label}</div>
                              <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                        </Link>
                      );
                    })}
                  </nav>
                ) : (
                  <div className="grid gap-1">
                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Browse by Shelves ({CATEGORIES.length})
                    </p>
                    {CATEGORIES.map((c) => (
                      <Link
                        key={c}
                        to="/shop"
                        search={{ category: c }}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-secondary hover:text-primary"
                      >
                        <span className="font-medium">{c}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-border bg-surface/50 p-3">
                <Link
                  to={user ? "/account" : "/auth"}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg bg-secondary/80 px-3 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>{user ? "My Account" : "Sign In / Register"}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src={logo} alt="Sanabooks India logo" className="h-9 w-9 rounded-full object-contain" />
            <span className="text-lg font-bold tracking-tight text-primary">Sanabooks India</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="ml-4 hidden items-center gap-4 lg:flex">
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

            <Link to="/shop" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Shop All
            </Link>

            <Link
              to="/age/$tag"
              params={{ tag: "age-3-5" }}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              By Age
            </Link>

            <Link
              to="/reading-room"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              Reading Room
            </Link>

            <Link to="/schools" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Schools
            </Link>

            {/* Desktop Orders & Help Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-sm font-medium text-foreground/80 hover:text-primary"
                >
                  <PackageSearch className="h-4 w-4 text-primary" />
                  Track & Help
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 p-1.5">
                <DropdownMenuItem asChild>
                  <Link to="/track" className="cursor-pointer gap-2.5 font-medium py-2">
                    <PackageSearch className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Track Order</div>
                      <div className="text-[10px] text-muted-foreground">Check live courier status</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/faq" className="cursor-pointer gap-2.5 text-xs font-medium py-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Frequently Asked Questions</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contact" className="cursor-pointer gap-2.5 text-xs font-medium py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>Contact Customer Care</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/about" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              About
            </Link>
          </nav>

          {/* Desktop Search bar */}
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

        {/* Mobile Search Bar (hidden on /shop since it lives in the sidebar filter) */}
        {!isShopPage && (
          <div className="border-t border-border/40 bg-surface/50 px-4 py-2 md:hidden">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) {
                  navigate({ to: "/shop", search: { q: query.trim() } });
                }
              }}
              className="relative w-full"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search books, phonics, bundles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-full rounded-full bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground/80 focus-visible:ring-1"
              />
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
