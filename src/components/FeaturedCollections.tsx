import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ProductRail } from "@/components/ProductRail";
import { fetchProducts } from "@/lib/catalog";
import { FEATURED_COLLECTIONS, type FeaturedCollection } from "@/lib/promotions";

function CollectionRow({ collection }: { collection: FeaturedCollection }) {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "collection", collection.id],
    queryFn: () => fetchProducts(12, collection.query),
  });

  return (
    <div className="mt-14 first:mt-0">
      <ProductRail
        products={data ?? []}
        isLoading={isLoading}
        eyebrow={collection.note}
        title={collection.title}
        action={
          <Link
            to="/shop"
            search={collection.search as never}
            className="mr-1 hidden items-center gap-1 text-sm font-semibold text-primary sm:flex"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    </div>
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
