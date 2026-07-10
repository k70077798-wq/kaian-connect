import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Phone, Video, Paperclip, Smile, Send, Forward, Reply, Trash2, Search, MessageSquarePlus, X, Check, CheckCheck } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { CallModal } from "@/components/CallModal";

export const Route = createFileRoute("/_app/messages")({
  component: MessagesPage,
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s.c === "string" ? s.c : undefined }),
});

type Profile = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
type Conversation = { id: string; is_group: boolean; title: string | null; avatar_url: string | null; last_message_at: string };
type Member = { conversation_id: string; user_id: string; last_read_at: string };
type Msg = {
  id: string; conversation_id: string; sender_id: string; content: string | null;
  media_url: string | null; media_type: string | null; file_name: string | null;
  reply_to: string | null; forwarded_from: string | null;
  call_kind: string | null; call_status: string | null; call_duration: number | null;
  created_at: string; deleted: boolean;
};

function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | undefined>(search.c);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Msg | null>(null);
  const [forwarding, setForwarding] = useState<Msg | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [foundUsers, setFoundUsers] = useState<Profile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [call, setCall] = useState<{ peer: string; peerName: string; kind: "audio" | "video"; initiator: boolean; initialOffer?: any; conversationId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations + members
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
      const ids = (mine || []).map((m) => m.conversation_id);
      if (!ids.length) { setConvs([]); setMembers([]); return; }
      const { data: cs } = await supabase.from("conversations").select("*").in("id", ids).order("last_message_at", { ascending: false });
      const { data: ms } = await supabase.from("conversation_members").select("conversation_id,user_id,last_read_at").in("conversation_id", ids);
      setConvs((cs || []) as any);
      setMembers((ms || []) as any);
      const userIds = Array.from(new Set((ms || []).map((m) => m.user_id)));
      if (userIds.length) {
        const { data: ps } = await supabase.from("profiles").select("id,full_name,username,avatar_url").in("id", userIds);
        const map: Record<string, Profile> = {};
        (ps || []).forEach((p) => (map[p.id] = p as any));
        setProfiles(map);
      }
    };
    load();
    const ch = supabase
      .channel(`msgs-list-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members" }, load);
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId || !user) return;
    const load = async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeId).order("created_at");
      setMsgs((data || []) as any);
      await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", activeId).eq("user_id", user.id);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    };
    load();
    const ch = supabase
      .channel(`msgs-${activeId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, load);
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, user]);

  // Listen for incoming call signals globally
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`incoming-call-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        (p) => {
          const sig: any = p.new;
          if (sig.kind === "offer" && !call) {
            const peerName = profiles[sig.from_user]?.full_name || profiles[sig.from_user]?.username || "مكالمة";
            setCall({ peer: sig.from_user, peerName, kind: sig.payload?.video ? "video" : "audio", initiator: false, initialOffer: sig.payload, conversationId: sig.conversation_id });
          }
        });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, profiles, call]);

  const peerOf = (cid: string): Profile | null => {
    if (!user) return null;
    const m = members.find((x) => x.conversation_id === cid && x.user_id !== user.id);
    return m ? profiles[m.user_id] || null : null;
  };

  const activeConv = convs.find((c) => c.id === activeId);
  const activePeer = activeConv ? peerOf(activeConv.id) : null;
  const convPeers = useMemo(() => convs.map((c) => ({ c, peer: peerOf(c.id) })), [convs, members, profiles]);

  const startConvWith = async (peer: Profile) => {
    if (!user) return;
    // find existing direct conversation
    const myConvIds = members.filter((m) => m.user_id === user.id).map((m) => m.conversation_id);
    const existing = members.find((m) => m.user_id === peer.id && myConvIds.includes(m.conversation_id));
    if (existing) {
      setActiveId(existing.conversation_id);
      setShowNew(false);
      return;
    }
    // NOTE: generate the id client-side and skip .select().single(),
    // because the conversations SELECT policy requires membership — which
    // isn't true until the members insert below. Reading the just-inserted
    // row otherwise fails with "تعذّر إنشاء المحادثة".
    const convId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { error: e1 } = await supabase.from("conversations").insert({ id: convId, created_by: user.id, is_group: false });
    if (e1) { toast.error("تعذّر إنشاء المحادثة"); return; }
    const { error: e2 } = await supabase.from("conversation_members").insert([
      { conversation_id: convId, user_id: user.id },
      { conversation_id: convId, user_id: peer.id },
    ]);
    if (e2) { toast.error("تعذّر إضافة الأعضاء"); return; }
    setActiveId(convId);
    setShowNew(false);
  };

  const doSearch = async (q: string) => {
    setSearchUsers(q);
    if (q.trim().length < 2) { setFoundUsers([]); return; }
    const { data } = await supabase.from("profiles").select("id,full_name,username,avatar_url")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).neq("id", user?.id || "").limit(10);
    setFoundUsers((data || []) as any);
  };

  const send = async (overrides: Partial<Msg> = {}) => {
    if (!user || !activeId || sending) return;
    const body = (overrides.content ?? text).trim();
    if (!body && !overrides.media_url) return;
    setSending(true);
    const payload: any = {
      conversation_id: activeId, sender_id: user.id,
      content: body || null,
      reply_to: reply?.id ?? null,
      ...overrides,
    };
    const { error } = await supabase.from("messages").insert(payload);
    setSending(false);
    if (error) { toast.error("تعذّر الإرسال"); return; }
    setText(""); setReply(null);
  };

  const onUpload = async (f: File) => {
    if (!user) return;
    setUploading(true);
    const ext = f.name.split(".").pop() || "bin";
    const path = `${user.id}/messages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, f);
    if (error) { setUploading(false); toast.error("فشل الرفع"); return; }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const mime = f.type;
    const media_type = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "file";
    await send({ media_url: pub.publicUrl, media_type, file_name: f.name, content: text.trim() || null });
    setUploading(false);
  };

  const startCall = async (kind: "audio" | "video") => {
    if (!user || !activePeer) return;
    setCall({ peer: activePeer.id, peerName: activePeer.full_name || activePeer.username || "مستخدم", kind, initiator: true, conversationId: activeId! });
  };

  const forwardTo = async (targetConvId: string) => {
    if (!user || !forwarding) return;
    await supabase.from("messages").insert({
      conversation_id: targetConvId, sender_id: user.id,
      content: forwarding.content, media_url: forwarding.media_url,
      media_type: forwarding.media_type, file_name: forwarding.file_name,
      forwarded_from: forwarding.id,
    });
    toast.success("تمت إعادة التوجيه");
    setForwarding(null);
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("messages").update({ deleted: true, content: null, media_url: null }).eq("id", id);
  };

  if (!user) return <div className="p-12 text-center text-muted-foreground">سجّل الدخول لاستخدام الرسائل</div>;

  return (
    <div className="mx-auto max-w-6xl px-2 sm:px-4 py-4">
      <Card className="overflow-hidden shadow-card h-[calc(100vh-7rem)] grid grid-cols-1 md:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <div className={`border-l bg-card flex flex-col ${activeId ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">المحادثات</h2>
            <Button size="icon" variant="ghost" onClick={() => setShowNew(true)}><MessageSquarePlus className="h-5 w-5" /></Button>
          </div>
          <ScrollArea className="flex-1">
            {convPeers.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">لا توجد محادثات بعد</div>}
            {convPeers.map(({ c, peer }) => {
              const me = members.find((m) => m.conversation_id === c.id && m.user_id === user.id);
              const unread = me && new Date(c.last_message_at) > new Date(me.last_read_at);
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 transition text-start border-b ${activeId === c.id ? "bg-muted" : ""}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={peer?.avatar_url || undefined} />
                    <AvatarFallback>{(peer?.full_name || peer?.username || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{peer?.full_name || peer?.username || "مستخدم"}</p>
                      {unread && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{new Date(c.last_message_at).toLocaleString("ar")}</p>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className={`flex flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
          {!activeConv ? (
            <div className="flex-1 grid place-items-center text-muted-foreground">اختر محادثة لبدء الدردشة</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setActiveId(undefined)}><X className="h-4 w-4" /></Button>
                <Avatar className="h-10 w-10 cursor-pointer" onClick={() => activePeer && navigate({ to: "/profile/$userId", params: { userId: activePeer.id } })}>
                  <AvatarImage src={activePeer?.avatar_url || undefined} />
                  <AvatarFallback>{(activePeer?.full_name || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold">{activePeer?.full_name || activePeer?.username || "مستخدم"}</p>
                  <p className="text-xs text-muted-foreground">@{activePeer?.username}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => startCall("audio")}><Phone className="h-5 w-5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => startCall("video")}><Video className="h-5 w-5" /></Button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2 bg-muted/20">
                {msgs.map((m) => {
                  const mine = m.sender_id === user.id;
                  const prof = profiles[m.sender_id];
                  const repliedTo = m.reply_to ? msgs.find((x) => x.id === m.reply_to) : null;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine && <Avatar className="h-7 w-7 mt-auto"><AvatarImage src={prof?.avatar_url || undefined} /><AvatarFallback>?</AvatarFallback></Avatar>}
                      <div className="group max-w-[78%]">
                        {m.forwarded_from && <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Forward className="h-3 w-3" />تمت إعادة توجيهها</p>}
                        <div className={`rounded-2xl px-3 py-2 shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
                          {repliedTo && (
                            <div className="mb-1.5 rounded-lg border-r-2 border-current/40 pr-2 py-1 text-xs opacity-80 truncate">
                              {repliedTo.content || repliedTo.file_name || "وسائط"}
                            </div>
                          )}
                          {m.deleted ? (
                            <p className="italic text-xs opacity-70">تم حذف الرسالة</p>
                          ) : m.call_kind ? (
                            <p className="text-sm flex items-center gap-2">
                              {m.call_kind === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                              {m.content}
                            </p>
                          ) : (
                            <>
                              {m.media_type === "image" && m.media_url && <img src={m.media_url} className="rounded-lg max-h-72 mb-1" />}
                              {m.media_type === "video" && m.media_url && <video src={m.media_url} controls className="rounded-lg max-h-72 mb-1" />}
                              {m.media_type === "audio" && m.media_url && <audio src={m.media_url} controls className="mb-1" />}
                              {m.media_type === "file" && m.media_url && (
                                <a href={m.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline mb-1">
                                  <Paperclip className="h-4 w-4" />{m.file_name || "ملف"}
                                </a>
                              )}
                              {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                            </>
                          )}
                          <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                            <span>{new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</span>
                            {mine && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                        {!m.deleted && (
                          <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition ${mine ? "justify-end" : "justify-start"}`}>
                            <button onClick={() => setReply(m)} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"><Reply className="h-3 w-3" />ردّ</button>
                            <button onClick={() => setForwarding(m)} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"><Forward className="h-3 w-3" />توجيه</button>
                            {mine && <button onClick={() => deleteMsg(m.id)} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3 w-3" />حذف</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {reply && (
                <div className="px-3 py-2 border-t bg-muted/40 flex items-center gap-2 text-xs">
                  <Reply className="h-3.5 w-3.5" />
                  <span className="flex-1 truncate">الردّ على: {reply.content || reply.file_name || "وسائط"}</span>
                  <button onClick={() => setReply(null)}><X className="h-4 w-4" /></button>
                </div>
              )}

              <div className="p-2 border-t flex items-end gap-1.5 bg-card">
                <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                <Button size="icon" variant="ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost"><Smile className="h-5 w-5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto border-0" align="start">
                    <EmojiPicker onEmojiClick={(e) => setText((t) => t + e.emoji)} width={320} height={380} />
                  </PopoverContent>
                </Popover>
                <Input
                  value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="اكتب رسالة…" className="flex-1"
                />
                <Button size="icon" disabled={sending || (!text.trim())} onClick={() => send()}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* New conversation dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>محادثة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchUsers} onChange={(e) => doSearch(e.target.value)} placeholder="ابحث عن مستخدم…" className="pr-9" />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {foundUsers.map((u) => (
                <button key={u.id} onClick={() => startConvWith(u)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-start">
                  <Avatar className="h-10 w-10"><AvatarImage src={u.avatar_url || undefined} /><AvatarFallback>{(u.full_name || "?").charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{u.full_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <Check className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward dialog */}
      <Dialog open={!!forwarding} onOpenChange={(o) => !o && setForwarding(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>إعادة توجيه إلى…</DialogTitle></DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {convPeers.map(({ c, peer }) => (
              <button key={c.id} onClick={() => forwardTo(c.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-start">
                <Avatar className="h-10 w-10"><AvatarImage src={peer?.avatar_url || undefined} /><AvatarFallback>?</AvatarFallback></Avatar>
                <p className="font-semibold text-sm flex-1">{peer?.full_name || peer?.username}</p>
                <Forward className="h-4 w-4" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {call && (
        <CallModal
          conversationId={call.conversationId}
          peerId={call.peer}
          peerName={call.peerName}
          kind={call.kind}
          initiator={call.initiator}
          initialOffer={call.initialOffer}
          onClose={() => setCall(null)}
        />
      )}
    </div>
  );
}
