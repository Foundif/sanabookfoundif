import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Reads the signed-in user's staff/admin roles from the database. */
export function useRole() {
  const { user, loading } = useAuth();

  const query = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as string);
    },
  });

  const roles = query.data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("admin") || roles.includes("staff"),
    loading: loading || query.isLoading,
    refetch: query.refetch,
  };
}

/** Grants admin to the current user when the store has no admin yet. */
export async function claimAdmin() {
  const { data, error } = await supabase.rpc("claim_admin_if_none");
  if (error) throw error;
  return data === true;
}
