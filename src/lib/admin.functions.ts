import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, deleteAdminUser, getAdminUserDetails, listAdminUsers, messageAdminUser, notifyAdminUser, setAdminUserBan, updateAdminUser } from "./admin.server";

export const adminListUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context.userId);
  return listAdminUsers();
});

export const adminGetUser = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data)).handler(async ({ context, data }) => {
  await assertAdmin(context.userId);
  return getAdminUserDetails(data.userId);
});

export const adminUpdateUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), fullName: z.string().max(100).optional(), username: z.string().regex(/^[A-Za-z0-9_]{2,32}$/).optional(), bio: z.string().max(500).optional(), verified: z.boolean().optional() }).parse(data)).handler(async ({ context, data }) => {
  await assertAdmin(context.userId);
  return updateAdminUser(data.userId, data);
});

export const adminSetUserBan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(data)).handler(async ({ context, data }) => {
  await assertAdmin(context.userId);
  if (data.userId === context.userId) throw new Error("لا يمكنك حظر حسابك الإداري");
  return setAdminUserBan(data.userId, data.banned);
});

export const adminDeleteUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data)).handler(async ({ context, data }) => {
  await assertAdmin(context.userId);
  if (data.userId === context.userId) throw new Error("لا يمكنك حذف حسابك الإداري");
  return deleteAdminUser(data.userId);
});

export const adminNotifyUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(1000), imageUrl: z.string().url().max(2000).optional().or(z.literal("")), actionUrl: z.string().max(500).optional().refine((value) => !value || value.startsWith("/"), "الرابط يجب أن يكون داخل المنصة") }).parse(data)).handler(async ({ context, data }) => {
  await assertAdmin(context.userId);
  return notifyAdminUser(data.userId, data);
});

export const adminMessageUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ userId: z.string().uuid(), content: z.string().trim().min(1).max(2000) }).parse(data)).handler(async ({ context, data }) => {
  await assertAdmin(context.userId);
  return messageAdminUser(context.userId, data.userId, data.content);
});