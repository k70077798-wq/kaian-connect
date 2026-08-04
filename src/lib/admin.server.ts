import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

export async function listAdminUsers() {
  const [{ data: profiles, error: profileError }, authResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ]);
  if (profileError) throw profileError;
  if (authResult.error) throw authResult.error;
  const emails = new Map(authResult.data.users.map((user) => [user.id, user.email ?? null]));
  return (profiles ?? []).map((profile) => ({ ...profile, email: emails.get(profile.id) ?? null }));
}

export async function getAdminUserDetails(userId: string) {
  const [profileResult, authResult, postsResult, pagesResult, groupsResult, friendshipsResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("pages").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabaseAdmin.from("groups").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabaseAdmin.from("friendships").select("id,requester_id,addressee_id,status").eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (authResult.error) throw authResult.error;
  return {
    profile: profileResult.data,
    email: authResult.data.user.email ?? null,
    lastSignInAt: authResult.data.user.last_sign_in_at ?? null,
    posts: postsResult.data ?? [],
    pages: pagesResult.data ?? [],
    groups: groupsResult.data ?? [],
    friendsCount: friendshipsResult.data?.length ?? 0,
  };
}

export async function updateAdminUser(userId: string, values: { fullName?: string; username?: string; bio?: string; verified?: boolean }) {
  const payload = {
    full_name: values.fullName === undefined ? undefined : values.fullName.trim() || null,
    username: values.username === undefined ? undefined : values.username.trim() || null,
    bio: values.bio === undefined ? undefined : values.bio.trim() || null,
    verified: values.verified,
  };
  const { error } = await supabaseAdmin.from("profiles").update(payload).eq("id", userId);
  if (error) throw error;
  return { ok: true };
}

export async function setAdminUserBan(userId: string, banned: boolean) {
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (authError) throw authError;
  const { error } = await supabaseAdmin.from("profiles").update({ is_banned: banned }).eq("id", userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteAdminUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return { ok: true };
}

export async function notifyAdminUser(userId: string, input: { title: string; content: string; imageUrl?: string; actionUrl?: string }) {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "admin",
    title: input.title.trim(),
    content: input.content.trim(),
    image_url: input.imageUrl?.trim() || null,
    action_url: input.actionUrl?.trim() || null,
    link: input.actionUrl?.trim() || null,
  } as never);
  if (error) throw error;
  return { ok: true };
}

export async function messageAdminUser(adminId: string, userId: string, content: string) {
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id,conversation_members!inner(user_id)")
    .eq("title", "حساب KAIAN الرسمي")
    .eq("created_by", adminId)
    .limit(50);
  let conversationId = (existing ?? []).find((conversation) => {
    const members = conversation.conversation_members as Array<{ user_id: string }>;
    return members.some((member) => member.user_id === userId);
  })?.id;
  if (!conversationId) {
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .insert({ created_by: adminId, is_group: false, title: "حساب KAIAN الرسمي" })
      .select("id")
      .single();
    if (conversationError) throw conversationError;
    conversationId = conversation.id;
    const { error: membersError } = await supabaseAdmin.from("conversation_members").insert([
      { conversation_id: conversationId, user_id: adminId },
      { conversation_id: conversationId, user_id: userId },
    ]);
    if (membersError) throw membersError;
  }
  const { error } = await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: adminId,
    content: content.trim(),
  });
  if (error) throw error;
  return { conversationId };
}