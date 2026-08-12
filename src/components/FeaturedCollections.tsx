import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProducts } from "@/lib/shopify";
import { FEATURED_COLLECTIONS, type FeaturedCollection } from "@/lib/promotions";

function CollectionRow({ collection }: { collection: FeaturedCollection }) {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "collection", collection.id],
    queryFn: () => fetchProducts(8, collection.query),
  });

  const items = (data ?? []).slice(0, 4);
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="mt-14 first:mt-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{collection.note}</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{collection.title}</h2>
        </div>
        <Link
          to="/shop"
          search={collection.search as never}
          className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex"
        >
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)
          : items.map((p) => <ProductCard key={p.node.id} product={p} />)}
      </div>
    </section>
  );
}

export function FeaturedCollections() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      {FEATURED_COLLECTIONS.map((c) => (
        <CollectionRow key={c.id} collection={c} />
      ))}
    </div>
  );
}
