import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share2, Music2, Volume2, VolumeX, Pause, Play, MoreHorizontal, Send, ChevronUp, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reels")({
  component: ReelsPage,
  validateSearch: (s: Record<string, unknown>) => ({ start: typeof s.start === "string" ? s.start : undefined }),
});

interface Reel {
  id: string; user_id: string; content: string | null; video_url: string;
  profile?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null } | null;
  likes_count: number; comments_count: number; liked_by_me: boolean;
}

function ReelCard({ reel, active, muted, onToggleMute, onLike, onComment, onShare, currentUserId }: {
  reel: Reel; active: boolean; muted: boolean;
  onToggleMute: () => void;
  onLike: (r: Reel) => void;
  onComment: (r: Reel) => void;
  onShare: (r: Reel) => void;
  currentUserId?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (active) { v.currentTime = 0; v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); }
  }, [active]);

  const togglePlay = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  return (
    <div className="snap-start h-full w-full grid place-items-center bg-black">
      <div className="relative h-full max-h-[100dvh] aspect-[9/16] w-full sm:w-auto sm:rounded-2xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={ref}
          src={reel.video_url}
          loop
          muted={muted}
          playsInline
          onClick={togglePlay}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* tap-to-pause indicator */}
        {paused && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-black/50 backdrop-blur">
              <Play className="h-10 w-10 text-white fill-current" />
            </div>
          </div>
        )}

        {/* gradients */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* progress */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20">
          <div className="h-full bg-white" style={{ width: `${progress}%` }} />
        </div>

        {/* top mute */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
          <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur">ريلز</span>
          <Button onClick={onToggleMute} variant="ghost" size="icon" className="rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white backdrop-blur">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* right rail actions */}
        <div className="absolute bottom-24 left-3 flex flex-col items-center gap-5 text-white">
          <button onClick={() => onLike(reel)} className="flex flex-col items-center gap-1">
            <div className={`grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur ${reel.liked_by_me ? "text-primary" : ""}`}>
              <Heart className={`h-6 w-6 ${reel.liked_by_me ? "fill-current" : ""}`} />
            </div>
            <span className="text-xs font-bold drop-shadow">{reel.likes_count}</span>
          </button>
          <button onClick={() => onComment(reel)} className="flex flex-col items-center gap-1">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur"><MessageCircle className="h-6 w-6" /></div>
            <span className="text-xs font-bold drop-shadow">{reel.comments_count}</span>
          </button>
          <button onClick={() => onShare(reel)} className="flex flex-col items-center gap-1">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur"><Share2 className="h-6 w-6" /></div>
            <span className="text-xs font-bold drop-shadow">مشاركة</span>
          </button>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur"><MoreHorizontal className="h-6 w-6" /></button>
        </div>

        {/* bottom info */}
        <div className="absolute bottom-4 right-4 left-20 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-9 w-9 ring-2 ring-white">
              <AvatarImage src={reel.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">
                {(reel.profile?.full_name || "K").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm flex items-center gap-1">
                {reel.profile?.full_name || "مستخدم"}
                {reel.profile?.verified && <span className="text-primary">✓</span>}
              </p>
              <p className="text-[11px] text-white/70">@{reel.profile?.username || "—"}</p>
            </div>
            {reel.user_id !== currentUserId && (
              <Button size="sm" variant="secondary" className="rounded-full h-7 px-3 text-xs font-bold">متابعة</Button>
            )}
          </div>
          {reel.content && <p className="text-sm line-clamp-2 drop-shadow">{reel.content}</p>}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-white/80">
            <Music2 className="h-3.5 w-3.5" />
            <span className="truncate">الصوت الأصلي • {reel.profile?.full_name || "مستخدم"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { start } = Route.useSearch();
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState<Reel | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, user_id, content, video_url")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data) { setLoading(false); return; }
    const ids = [...new Set(data.map((p) => p.user_id))];
    const postIds = data.map((p) => p.id);
    const [{ data: profs }, { data: likes }, { data: cmts }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", ids),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);
    const pmap = new Map((profs || []).map((p) => [p.id, p]));
    let list = data.map((p: any) => ({
      ...p,
      video_url: p.video_url as string,
      profile: pmap.get(p.user_id),
      likes_count: (likes || []).filter((l) => l.post_id === p.id).length,
      comments_count: (cmts || []).filter((c) => c.post_id === p.id).length,
      liked_by_me: !!(likes || []).find((l) => l.post_id === p.id && l.user_id === user?.id),
    })) as Reel[];
    if (start) {
      const idx = list.findIndex((r) => r.id === start);
      if (idx > 0) list = [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)];
    }
    setReels(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("reels-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (!row?.post_id) return;
        setReels(prev => prev.map(r => {
          if (r.id !== row.post_id) return r;
          if (payload.eventType === "INSERT") {
            return { ...r, likes_count: r.likes_count + 1, liked_by_me: row.user_id === user?.id ? true : r.liked_by_me };
          }
          if (payload.eventType === "DELETE") {
            return { ...r, likes_count: Math.max(0, r.likes_count - 1), liked_by_me: row.user_id === user?.id ? false : r.liked_by_me };
          }
          return r;
        }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments" }, (payload) => {
        const row: any = payload.new;
        setReels(prev => prev.map(r => r.id === row.post_id ? { ...r, comments_count: r.comments_count + 1 } : r));
        setCommentsOpen(curr => {
          if (curr && curr.id === row.post_id && row.user_id !== user?.id) {
            supabase.from("profiles").select("id, full_name, avatar_url").eq("id", row.user_id).maybeSingle()
              .then(({ data }) => setComments(prev => [...prev, { ...row, profile: data }]));
          }
          return curr;
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // observe which is active
  useEffect(() => {
    if (!containerRef.current || !reels.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          setActiveIdx(idx);
        }
      });
    }, { root: containerRef.current, threshold: [0.6] });
    itemRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels.length]);

  const scrollTo = (idx: number) => {
    const el = itemRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") scrollTo(Math.min(activeIdx + 1, reels.length - 1));
      if (e.key === "ArrowUp") scrollTo(Math.max(activeIdx - 1, 0));
      if (e.key === "m") setMuted((m) => !m);
      if (e.key === "Escape") navigate({ to: "/home" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, reels.length]);

  const toggleLike = async (reel: Reel) => {
    if (!user) return;
    setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, liked_by_me: !r.liked_by_me, likes_count: r.likes_count + (r.liked_by_me ? -1 : 1) } : r));
    if (reel.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", reel.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: reel.id, user_id: user.id });
    }
  };

  const sharePost = async (reel: Reel) => {
    const url = `${window.location.origin}/reels?start=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "ريل من KAIAN" });
      else { await navigator.clipboard.writeText(url); toast.success("تم نسخ الرابط"); }
    } catch {}
  };

  const openComments = async (reel: Reel) => {
    setCommentsOpen(reel);
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", reel.id).order("created_at", { ascending: true });
    if (!data) return;
    const ids = [...new Set(data.map((c) => c.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
    const pmap = new Map((profs || []).map((p) => [p.id, p]));
    setComments(data.map((c) => ({ ...c, profile: pmap.get(c.user_id) })));
  };

  const submitComment = async () => {
    if (!commentsOpen || !user || !newComment.trim()) return;
    const { data } = await supabase.from("post_comments").insert({ post_id: commentsOpen.id, user_id: user.id, content: newComment.trim() }).select("*").single();
    if (data) {
      setComments((prev) => [...prev, data]);
      setReels((prev) => prev.map((r) => r.id === commentsOpen.id ? { ...r, comments_count: r.comments_count + 1 } : r));
      setNewComment("");
    }
  };

  return (
    <div className="fixed inset-0 top-16 bg-black">
      <div ref={containerRef} className="h-[calc(100dvh-4rem)] overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {loading && <div className="h-full grid place-items-center text-white">جاري التحميل...</div>}
        {!loading && !reels.length && (
          <div className="h-full grid place-items-center text-white text-center px-6">
            <div>
              <p className="text-xl font-bold mb-2">لا توجد ريلز بعد</p>
              <p className="text-white/60">انشر أول فيديو ليظهر هنا!</p>
            </div>
          </div>
        )}
        {reels.map((r, idx) => (
          <div key={r.id} ref={(el) => { itemRefs.current[idx] = el; }} data-idx={idx} className="h-[calc(100dvh-4rem)] snap-start">
            <ReelCard
              reel={r}
              active={idx === activeIdx}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onLike={toggleLike}
              onComment={openComments}
              onShare={sharePost}
              currentUserId={user?.id}
            />
          </div>
        ))}
      </div>

      {/* nav arrows (desktop) */}
      {reels.length > 0 && (
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-10">
          <Button onClick={() => scrollTo(Math.max(activeIdx - 1, 0))} size="icon" variant="secondary" className="rounded-full"><ChevronUp className="h-5 w-5" /></Button>
          <Button onClick={() => scrollTo(Math.min(activeIdx + 1, reels.length - 1))} size="icon" variant="secondary" className="rounded-full"><ChevronDown className="h-5 w-5" /></Button>
        </div>
      )}

      {/* comments panel */}
      {commentsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center z-20" onClick={() => setCommentsOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-[420px] sm:rounded-2xl rounded-t-3xl bg-card max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-bold">التعليقات</h3>
              <Button size="icon" variant="ghost" onClick={() => setCommentsOpen(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">كن أول من يعلق</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">
                      {(c.profile?.full_name || "K").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-2xl bg-muted px-3 py-2">
                    <p className="text-xs font-bold">{c.profile?.full_name || "مستخدم"}</p>
                    <p className="text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t p-3">
              <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment()} placeholder="اكتب تعليقًا..." className="rounded-full bg-muted border-0" />
              <Button size="icon" onClick={submitComment} className="rounded-full"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
