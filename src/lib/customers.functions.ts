import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) {
    throw new Error("Only admins can do this");
  }
  return roles.includes("admin");
}

/** Account email and sign-in dates for one customer (staff only). */
export const getCustomerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const u = res?.user;
    return {
      email: u?.email ?? null,
      createdAt: u?.created_at ?? null,
      lastSignIn: u?.last_sign_in_at ?? null,
      provider: (u?.app_metadata?.provider as string | undefined) ?? null,
    };
  });

/** Permanently removes a customer account. Past orders are kept for records. */
export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await assertAdmin(context.supabase, context.userId);
    if (!isAdmin) throw new Error("Only the store owner can delete customers");
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("addresses").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("wishlist_items").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("product_reviews").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
