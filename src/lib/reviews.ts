import { supabase } from "@/integrations/supabase/client";

export interface ReviewRow {
  id: string;
  user_id: string;
  product_handle: string;
  product_title: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
}

export interface ReviewWithAuthor extends ReviewRow {
  author: string;
}

export async function fetchReviews(handle: string): Promise<ReviewWithAuthor[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_handle", handle)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ReviewRow[];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profiles ?? []) {
      if (p.display_name) names.set(p.id, p.display_name);
    }
  }

  return rows.map((r) => ({ ...r, author: names.get(r.user_id) ?? "Sanabooks reader" }));
}

export async function fetchMyReviews(userId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
}

export async function upsertReview(input: {
  userId: string;
  handle: string;
  productTitle: string;
  rating: number;
  title: string;
  body: string;
}) {
  const { error } = await supabase.from("product_reviews").upsert(
    {
      user_id: input.userId,
      product_handle: input.handle,
      product_title: input.productTitle,
      rating: input.rating,
      title: input.title || null,
      body: input.body || null,
    },
    { onConflict: "user_id,product_handle" },
  );
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("product_reviews").delete().eq("id", id);
  if (error) throw error;
}

export function summarise(reviews: { rating: number }[]) {
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  return { count, average, buckets };
}
