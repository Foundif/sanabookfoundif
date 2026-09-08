import { useQuery } from "@tanstack/react-query";
import { fetchRatingSummaries } from "@/lib/reviews";

/** Star averages for every book, read once and shared across cards. */
export function useRatings() {
  const { data } = useQuery({
    queryKey: ["rating-summaries"],
    queryFn: fetchRatingSummaries,
    staleTime: 60_000,
  });
  const map = data ?? {};
  return (handle: string) => map[handle] ?? { average: 0, count: 0 };
}
