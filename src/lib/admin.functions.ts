import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminListUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { listAdminUsers } = await import("./admin.server");
  return listAdminUsers();
});

export const adminGetUser = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data)).handler(async ({ context, data }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { getAdminUserDetails } = await import("./admin.server");
  return getAdminUserDetails(data.userId);
});

export const adminUpdateUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), fullName: z.string().max(100).optional(), username: z.string().regex(/^[A-Za-z0-9_]{2,32}$/).optional(), bio: z.string().max(500).optional(), verified: z.boolean().optional() }).parse(data)).handler(async ({ context, data }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { updateAdminUser } = await import("./admin.server");
  return updateAdminUser(data.userId, data);
});

export const adminSetUserBan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(data)).handler(async ({ context, data }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { setAdminUserBan } = await import("./admin.server");
  if (data.userId === context.userId) throw new Error("لا يمكنك حظر حسابك الإداري");
  return setAdminUserBan(data.userId, data.banned);
});

export const adminDeleteUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data)).handler(async ({ context, data }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { deleteAdminUser } = await import("./admin.server");
  if (data.userId === context.userId) throw new Error("لا يمكنك حذف حسابك الإداري");
  return deleteAdminUser(data.userId);
});

export const adminNotifyUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(1000), imageUrl: z.string().url().max(2000).optional().or(z.literal("")), actionUrl: z.string().max(500).optional().refine((value) => !value || value.startsWith("/"), "الرابط يجب أن يكون داخل المنصة") }).parse(data)).handler(async ({ context, data }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { notifyAdminUser } = await import("./admin.server");
  return notifyAdminUser(data.userId, data);
});

export const adminMessageUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), content: z.string().trim().min(1).max(2000) }).parse(data)).handler(async ({ context, data }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Response("Forbidden", { status: 403 });
  const { messageAdminUser } = await import("./admin.server");
  return messageAdminUser(context.userId, data.userId, data.content);
});