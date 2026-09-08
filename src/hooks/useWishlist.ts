import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { addToWishlist, fetchWishlist, removeFromWishlist } from "@/lib/account";

/** Saved books for the signed-in shopper, shared with the account wishlist tab. */
export function useWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: fetchWishlist,
    enabled: !!user,
  });

  const items = data ?? [];
  const handles = new Set(items.map((i) => i.product_handle));

  const toggle = useCallback(
    async (item: { handle: string; title: string; image: string | null }) => {
      if (!user) {
        toast.error("Sign in to save books", {
          description: "Your wishlist travels with your account.",
        });
        return;
      }
      const saved = handles.has(item.handle);
      try {
        if (saved) {
          await removeFromWishlist(user.id, item.handle);
          toast.success("Removed from wishlist", { description: item.title });
        } else {
          await addToWishlist(user.id, {
            product_handle: item.handle,
            product_title: item.title,
            image_url: item.image,
          });
          toast.success("Saved to wishlist", { description: item.title });
        }
        await queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
      } catch {
        toast.error("Could not update your wishlist. Please try again.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, items, queryClient],
  );

  return { items, count: items.length, isSaved: (h: string) => handles.has(h), toggle };
}
