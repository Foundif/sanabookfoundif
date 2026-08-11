import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { AGE_GROUPS, CATEGORIES, fetchProducts } from "@/lib/shopify";

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
        content:
          "Parent-friendly filters, clear ₹ pricing and free shipping over ₹499 across India.",
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

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [prices, setPrices] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "shop"],
    queryFn: () => fetchProducts(60),
  });

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (search.age) list = list.filter((p) => p.node.tags.includes(search.age!));
    if (search.category) list = list.filter((p) => p.node.productType === search.category);
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter(
        (p) =>
          p.node.title.toLowerCase().includes(q) || p.node.description.toLowerCase().includes(q),
      );
    }
    if (languages.length)
      list = list.filter((p) => languages.some((l) => p.node.tags.includes(l)));
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
          parseFloat(a.node.priceRange.minVariantPrice.amount) -
          parseFloat(b.node.priceRange.minVariantPrice.amount),
      );
    if (sort === "high")
      sorted.sort(
        (a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) -
          parseFloat(a.node.priceRange.minVariantPrice.amount),
      );
    if (sort === "title") sorted.sort((a, b) => a.node.title.localeCompare(b.node.title));
    return sorted;
  }, [products, search.age, search.category, search.q, languages, prices, sort]);

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <span className="text-foreground">Shop</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {search.category ?? (search.age ? "Books by age" : "The whole library")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoading ? "Loading books…" : `${filtered.length} books`}
            {search.q ? ` matching “${search.q}”` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-7">
          <div>
            <h2 className="eyebrow">Age</h2>
            <div className="mt-3 space-y-1">
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
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    search.age === a.tag
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-secondary"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="eyebrow">Category</h2>
            <div className="mt-3 space-y-1">
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
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    search.category === c
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="eyebrow">Language</h2>
            <div className="mt-3 space-y-2">
              {LANGUAGES.map((l) => (
                <div key={l.tag} className="flex items-center gap-2">
                  <Checkbox
                    id={`lang-${l.tag}`}
                    checked={languages.includes(l.tag)}
                    onCheckedChange={() => toggle(l.tag, languages, setLanguages)}
                  />
                  <Label htmlFor={`lang-${l.tag}`} className="text-sm font-normal">
                    {l.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="eyebrow">Price</h2>
            <div className="mt-3 space-y-2">
              {PRICE_BANDS.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`price-${b.id}`}
                    checked={prices.includes(b.id)}
                    onCheckedChange={() => toggle(b.id, prices, setPrices)}
                  />
                  <Label htmlFor={`price-${b.id}`} className="text-sm font-normal">
                    {b.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setPrices([]);
              setLanguages([]);
              navigate({ search: {} });
            }}
          >
            Clear all filters
          </Button>
        </aside>

        <div>
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
              No products found.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.node.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
