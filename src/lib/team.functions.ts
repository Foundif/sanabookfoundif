// src/lib/team.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdminRole(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
  if (!roles.includes("admin")) {
    throw new Error("Only store owners can manage team members.");
  }
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error } = await supabaseAdmin.from("user_roles").select("id, user_id, role");
    if (error) throw error;

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const usersMap = new Map((usersData?.users ?? []).map((u) => [u.id, u]));

    return (roles ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role,
      email: usersMap.get(r.user_id)?.email ?? "Unknown email",
      createdAt: usersMap.get(r.user_id)?.created_at ?? "",
    }));
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["admin", "staff"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create or fetch auth user
    let userId: string;
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message.includes("already registered") || createError.message.includes("exists")) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const found = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (!found) throw new Error("User exists but could not be resolved.");
        userId = found.id;
      } else {
        throw new Error(createError.message);
      }
    } else {
      userId = createData.user.id;
    }

    // 2. Assign role
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: data.role },
      { onConflict: "user_id,role" }
    );
    if (roleError) throw new Error(roleError.message);

    return { ok: true, userId };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roleId: z.string(), targetUserId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.supabase, context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("You cannot remove your own admin role.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", data.roleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
