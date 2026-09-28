import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/ProductCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { AGE_GROUPS, CATEGORIES } from "@/lib/shopify";
import { fetchProducts } from "@/lib/catalog";

type ShopSearch = { age?: string | undefined; category?: string | undefined; q?: string | undefined };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const str = (key: string) => (typeof search[key] === "string" ? (search[key] as string) : undefined);
    return { age: str("age"), category: str("category"), q: str("q") };
  },
  head: () => ({
    meta: [
      { title: "Shop Children's Books by Age & Format | Sanabooks India" },
      {
        name: "description",
        content:
          "Filter our curated children's library by age, format and price. Picture books, early readers, chapter books, activity kits and bundles with ₹ pricing.",
      },
      { property: "og:title", content: "Shop Children's Books by Age | Sanabooks India" },
      {
        property: "og:description",
        content: "Parent-friendly filters, clear ₹ pricing and free shipping over ₹499 across India.",
      },
    ],
  }),
  component: Shop,
});

const PRICE_BANDS = [
  { id: "under-300", label: "Under ₹300", test: (p: number) => p < 300 },
  { id: "300-600", label: "₹300 – ₹600", test: (p: number) => p >= 300 && p <= 600 },
  { id: "600-1000", label: "₹600 – ₹1,000", test: (p: number) => p > 600 && p <= 1000 },
  { id: "over-1000", label: "Over ₹1,000", test: (p: number) => p > 1000 },
];

const LANGUAGES = [
  { tag: "english", label: "English" },
  { tag: "hindi", label: "Hindi" },
  { tag: "tamil", label: "Tamil" },
];

const VIEWS = [
  { id: "grid-2", label: "2 per row", icon: Rows3, cls: "grid gap-5 grid-cols-1 sm:grid-cols-2" },
  {
    id: "grid-3",
    label: "3 per row",
    icon: LayoutGrid,
    cls: "grid gap-5 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3",
  },
  {
    id: "grid-4",
    label: "4 per row",
    icon: LayoutGrid,
    cls: "grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
  },
  { id: "list", label: "List view", icon: List, cls: "grid gap-4 grid-cols-1" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchTerm, setSearchTerm] = useState(search.q ?? "");
  const [prices, setPrices] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");
  const [view, setView] = useState<ViewId>("grid-3");

  // Keep local search input synced with search.q URL param
  useEffect(() => {
    setSearchTerm(search.q ?? "");
  }, [search.q]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "shop"],
    queryFn: () => fetchProducts(1000),
  });

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (search.age) list = list.filter((p) => p.node.tags.includes(search.age!));
    if (search.category) list = list.filter((p) => p.node.productType === search.category);
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter((p) => p.node.title.toLowerCase().includes(q) || p.node.description.toLowerCase().includes(q));
    }
    if (languages.length) list = list.filter((p) => languages.some((l) => p.node.tags.includes(l)));
    if (prices.length) {
      list = list.filter((p) => {
        const price = parseFloat(p.node.priceRange.minVariantPrice.amount);
        return prices.some((id) => PRICE_BANDS.find((b) => b.id === id)?.test(price));
      });
    }
    const sorted = [...list];
    if (sort === "low")
      sorted.sort(
        (a, b) =>
          parseFloat(a.node.priceRange.minVariantPrice.amount) - parseFloat(b.node.priceRange.minVariantPrice.amount),
      );
    if (sort === "high")
      sorted.sort(
        (a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) - parseFloat(a.node.priceRange.minVariantPrice.amount),
      );
    if (sort === "title") sorted.sort((a, b) => a.node.title.localeCompare(b.node.title));
    return sorted;
  }, [products, search.age, search.category, search.q, languages, prices, sort]);

  const gridRef = useScrollReveal<HTMLDivElement>([filtered.length, view, isLoading]);

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const activeCount =
    (search.age ? 1 : 0) + (search.category ? 1 : 0) + (search.q ? 1 : 0) + prices.length + languages.length;

  const clearAll = () => {
    setSearchTerm("");
    setPrices([]);
    setLanguages([]);
    navigate({ search: {} });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (prev: ShopSearch) => ({ ...prev, q: searchTerm.trim() || undefined }) });
  };

  const clearSearch = () => {
    setSearchTerm("");
    navigate({ search: (prev: ShopSearch) => ({ ...prev, q: undefined }) });
  };

  const hasBrowseFilters = Boolean(search.age || search.category);
  const hasRefineFilters = prices.length > 0 || languages.length > 0;

  const filterPanel = (
    <div className="space-y-4">
      {/* Search Input inside Filter Sidebar */}
      <div>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-lg bg-card pl-9 pr-8 text-sm placeholder:text-muted-foreground/70"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Two Clean Tabs: Browse vs Refine */}
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/60 p-1">
          <TabsTrigger value="browse" className="relative text-xs font-semibold">
            Browse
            {hasBrowseFilters && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
          </TabsTrigger>
          <TabsTrigger value="refine" className="relative text-xs font-semibold">
            Refine
            {hasRefineFilters && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Browse (Age Groups + Categories) */}
        <TabsContent value="browse" className="mt-4 space-y-5">
          <div>
            <h2 className="eyebrow">Age Group</h2>
            <div className="mt-2.5 space-y-1">
              {AGE_GROUPS.map((a) => (
                <button
                  key={a.tag}
                  onClick={() =>
                    navigate({
                      search: (prev: ShopSearch) => ({
                        ...prev,
                        age: prev.age === a.tag ? undefined : a.tag,
                      }),
                    })
                  }
                  className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    search.age === a.tag
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "hover:bg-secondary text-foreground/90"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="eyebrow">Category</h2>
            <div className="mt-2.5 max-h-64 overflow-y-auto space-y-1 pr-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    navigate({
                      search: (prev: ShopSearch) => ({
                        ...prev,
                        category: prev.category === c ? undefined : c,
                      }),
                    })
                  }
                  className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    search.category === c
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "hover:bg-secondary text-foreground/90"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Refine (Price Bands + Language) */}
        <TabsContent value="refine" className="mt-4 space-y-5">
          <div>
            <h2 className="eyebrow">Price</h2>
            <div className="mt-2.5 space-y-2">
              {PRICE_BANDS.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`price-${b.id}`}
                    checked={prices.includes(b.id)}
                    onCheckedChange={() => toggle(b.id, prices, setPrices)}
                  />
                  <Label htmlFor={`price-${b.id}`} className="text-sm font-normal cursor-pointer">
                    {b.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="eyebrow">Language</h2>
            <div className="mt-2.5 space-y-2">
              {LANGUAGES.map((l) => (
                <div key={l.tag} className="flex items-center gap-2">
                  <Checkbox
                    id={`lang-${l.tag}`}
                    checked={languages.includes(l.tag)}
                    onCheckedChange={() => toggle(l.tag, languages, setLanguages)}
                  />
                  <Label htmlFor={`lang-${l.tag}`} className="text-sm font-normal cursor-pointer">
                    {l.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Clear Filters Button */}
      {activeCount > 0 && (
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={clearAll}>
          Clear all filters ({activeCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <span className="text-foreground">Shop</span>
      </nav>

      <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {search.category ?? (search.age ? "Books by age" : "The whole library")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading books…" : `${filtered.length} books`}
            {search.q ? ` matching “${search.q}”` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-start">
          <div
            role="group"
            aria-label="Change how books are shown"
            className="flex items-center gap-1 rounded-full border border-border bg-card p-1"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                title={v.label}
                aria-label={v.label}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                  view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.id === "list" ? "List" : v.id.replace("grid-", "")}</span>
              </button>
            ))}
          </div>
          <SlidersHorizontal className="hidden h-4 w-4 text-muted-foreground sm:block" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort books"
            className="rounded-md border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </header>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {search.q && <Chip label={`“${search.q}”`} onClear={clearSearch} />}
          {search.age && (
            <Chip
              label={AGE_GROUPS.find((a) => a.tag === search.age)?.label ?? search.age}
              onClear={() => navigate({ search: (p: ShopSearch) => ({ ...p, age: undefined }) })}
            />
          )}
          {search.category && (
            <Chip
              label={search.category}
              onClear={() => navigate({ search: (p: ShopSearch) => ({ ...p, category: undefined }) })}
            />
          )}
          {languages.map((l) => (
            <Chip
              key={l}
              label={LANGUAGES.find((x) => x.tag === l)?.label ?? l}
              onClear={() => toggle(l, languages, setLanguages)}
            />
          ))}
          {prices.map((p) => (
            <Chip
              key={p}
              label={PRICE_BANDS.find((b) => b.id === p)?.label ?? p}
              onClear={() => toggle(p, prices, setPrices)}
            />
          ))}
          <button onClick={clearAll} className="text-xs font-semibold text-primary underline">
            Clear all
          </button>
        </div>
      )}

      {/* Mobile filter trigger */}
      <div className="mt-5 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full rounded-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Search & Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto p-6">
            <SheetTitle className="text-base">Search & Filter books</SheetTitle>
            <div className="mt-5">{filterPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[250px_1fr] lg:items-start">
        <aside className="hidden lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 lg:pb-4">
          {filterPanel}
        </aside>

        <div>
          {isLoading ? (
            <div className={VIEWS.find((v) => v.id === view)!.cls}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={view === "list" ? "h-40 rounded-xl" : "h-80 rounded-xl sm:h-96"} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <p className="text-sm font-semibold">No products found.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing a filter or searching for another keyword.
              </p>
              <Button variant="outline" className="mt-5 rounded-full" onClick={clearAll}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div ref={gridRef} className={VIEWS.find((v) => v.id === view)!.cls}>
              {filtered.map((p) => (
                <ProductCard key={p.node.id} product={p} view={view === "list" ? "list" : "grid"} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
    >
      {label} <X className="h-3 w-3" />
    </button>
  );
}
