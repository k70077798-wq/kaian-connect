import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export const adminSaveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ value: z.record(z.string(), z.unknown()) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed) throw new Response("Forbidden", { status: 403 });
    const { error } = await context.supabase.from("app_settings").upsert({ key: "site_customization", value: data.value as Json, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });