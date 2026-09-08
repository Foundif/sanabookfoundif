import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import logo from "@/assets/sanabooks-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartButton } from "@/components/CartDrawer";
import { CATEGORIES } from "@/lib/shopify";
import { useAuth } from "@/hooks/useAuth";

const NOTICES = [
  "Free shipping over ₹499",
  "Cash on delivery available",
  "Up to 25% off bundles",
  "GST invoicing on every order",
];

const NAV = [
  { label: "Shop", to: "/shop" },
  { label: "By Age", to: "/age/$tag", params: { tag: "age-3-5" } },
  { label: "Bundles", to: "/shop", search: { category: "Bundles" } },
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      <div className="group overflow-hidden bg-navy text-navy-foreground">
        <div className="flex w-max animate-marquee items-center py-2 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((dup) => (
            <div
              key={dup}
              aria-hidden={dup === 1}
              className="flex shrink-0 items-center gap-3 pr-3"
            >
              {NOTICES.map((notice, i) => (
                <span
                  key={i}
                  className="flex items-center gap-3 text-xs font-medium tracking-wide whitespace-nowrap"
                >
                  {notice}
                  <span className="text-navy-foreground/40">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`border-b border-border bg-surface transition-shadow ${scrolled ? "shadow-shelf" : ""}`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetTitle className="px-1 text-base">Browse Sanabooks India</SheetTitle>
              <nav className="mt-6 grid gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    search={item.search as never} params={(item as { params?: Record<string,string> }).params as never}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 eyebrow px-3">Categories</div>
                {CATEGORIES.map((c) => (
                  <Link
                    key={c}
                    to="/shop"
                    search={{ category: c }}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    {c}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src={logo}
              alt="Sanabooks India logo"
              className="h-9 w-9 rounded-full object-contain"
            />
            <span className="text-lg font-bold text-primary">Sanabooks India</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={item.search as never} params={(item as { params?: Record<string,string> }).params as never}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 md:flex"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                window.location.href = `/shop?q=${encodeURIComponent(query.trim())}`;
              }
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the library"
                aria-label="Search books"
                className="rounded-full bg-secondary pl-9"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label={user ? "Your account" : "Sign in"}
              asChild
            >
              <Link to={user ? "/account" : "/auth"}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
            <CartButton />
          </div>
        </div>

        <div className="hidden border-t border-border lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to="/shop"
                search={{ category: c }}
                className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                {c}
              </Link>
            ))}
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-leaf">
              <ShoppingBag className="h-3.5 w-3.5" /> COD · UPI · GST invoicing
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
