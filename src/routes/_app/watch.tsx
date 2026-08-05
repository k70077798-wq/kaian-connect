import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Send, X, ChevronUp, ChevronDown, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_app/watch")({
  component: WatchPage,
  validateSearch: (s: Record<string, unknown>) => ({ start: typeof s.start === "string" ? s.start : undefined }),
});

interface VideoPost {
  id: string; user_id: string; content: string | null; video_url: string; created_at: string;
  profile?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null } | null;
  likes_count: number; comments_count: number; liked_by_me: boolean;
}

function VideoCard({ post, active, muted, onToggleMute, onLike, onComment, onShare, currentUserId }: {
  post: VideoPost; active: boolean; muted: boolean;
  onToggleMute: () => void;
  onLike: (p: VideoPost) => void;
  onComment: (p: VideoPost) => void;
  onShare: (p: VideoPost) => void;
  currentUserId?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (active) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); }
  }, [active]);

  const togglePlay = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  return (
    <div className="snap-start min-h-[calc(100dvh-4rem)] w-full flex items-center justify-center py-4 px-2">
      <div className="w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-lg border">
        {/* header */}
        <div className="flex items-center gap-3 p-3">
          <Link to="/profile/$userId" params={{ userId: post.user_id }} aria-label={`فتح ملف ${post.profile?.full_name || "المستخدم"}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">
              {(post.profile?.full_name || "K").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to="/profile/$userId" params={{ userId: post.user_id }} className="font-bold text-sm flex items-center gap-1 truncate hover:underline">
              {post.profile?.full_name || "مستخدم"}
              {post.profile?.verified && <span className="text-primary">✓</span>}
            </Link>
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ar })}
            </p>
          </div>
          {post.user_id !== currentUserId && (
            <Button size="sm" className="rounded-full h-8 px-3 text-xs font-bold">متابعة</Button>
          )}
          <Button size="icon" variant="ghost" className="rounded-full"><MoreHorizontal className="h-5 w-5" /></Button>
        </div>

        {post.content && <p className="px-4 pb-2 text-sm whitespace-pre-wrap">{post.content}</p>}

        {/* video */}
        <div className="relative bg-black aspect-video">
          <video
            ref={ref}
            src={post.video_url}
            loop
            muted={muted}
            playsInline
            onClick={togglePlay}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
            }}
            className="absolute inset-0 h-full w-full object-contain"
          />
          {paused && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-black/50 backdrop-blur">
                <Play className="h-8 w-8 text-white fill-current" />
              </div>
            </div>
          )}
          <Button onClick={onToggleMute} variant="ghost" size="icon" className="absolute top-3 right-3 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white backdrop-blur">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* actions */}
        <div className="px-2 py-1 flex items-center justify-around border-t">
          <Button variant="ghost" size="sm" onClick={() => onLike(post)} className={`gap-2 flex-1 ${post.liked_by_me ? "text-primary" : ""}`}>
            <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} /> إعجاب {post.likes_count > 0 && `(${post.likes_count})`}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onComment(post)} className="gap-2 flex-1">
            <MessageCircle className="h-4 w-4" /> تعليق {post.comments_count > 0 && `(${post.comments_count})`}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onShare(post)} className="gap-2 flex-1">
            <Share2 className="h-4 w-4" /> مشاركة
          </Button>
        </div>
      </div>
    </div>
  );
}

function WatchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { start } = Route.useSearch();
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState<VideoPost | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, user_id, content, video_url, created_at")
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
    })) as VideoPost[];
    if (start) {
      const idx = list.findIndex((r) => r.id === start);
      if (idx > 0) list = [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)];
    }
    setPosts(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!containerRef.current || !posts.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.5) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          setActiveIdx(idx);
        }
      });
    }, { root: containerRef.current, threshold: [0.5] });
    itemRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [posts.length]);

  const scrollTo = (idx: number) => {
    const el = itemRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") scrollTo(Math.min(activeIdx + 1, posts.length - 1));
      if (e.key === "ArrowUp") scrollTo(Math.max(activeIdx - 1, 0));
      if (e.key === "m") setMuted((m) => !m);
      if (e.key === "Escape") navigate({ to: "/home" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, posts.length]);

  const toggleLike = async (post: VideoPost) => {
    if (!user) return;
    setPosts((prev) => prev.map((r) => r.id === post.id ? { ...r, liked_by_me: !r.liked_by_me, likes_count: r.likes_count + (r.liked_by_me ? -1 : 1) } : r));
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const sharePost = async (post: VideoPost) => {
    const url = `${window.location.origin}/watch?start=${post.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "فيديو من KAIAN" });
      else { await navigator.clipboard.writeText(url); toast.success("تم نسخ الرابط"); }
    } catch {}
  };

  const openComments = async (post: VideoPost) => {
    setCommentsOpen(post);
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
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
      setPosts((prev) => prev.map((r) => r.id === commentsOpen.id ? { ...r, comments_count: r.comments_count + 1 } : r));
      setNewComment("");
    }
  };

  return (
    <div className="fixed inset-0 top-16 bg-background">
      <div ref={containerRef} className="h-[calc(100dvh-4rem)] overflow-y-auto snap-y snap-mandatory">
        {loading && <div className="h-full grid place-items-center">جاري التحميل...</div>}
        {!loading && !posts.length && (
          <div className="h-full grid place-items-center text-center px-6">
            <div>
              <p className="text-xl font-bold mb-2">لا توجد فيديوهات بعد</p>
              <p className="text-muted-foreground">انشر أول فيديو ليظهر هنا!</p>
            </div>
          </div>
        )}
        {posts.map((p, idx) => (
          <div key={p.id} ref={(el) => { itemRefs.current[idx] = el; }} data-idx={idx}>
            <VideoCard
              post={p}
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

      {posts.length > 0 && (
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-10">
          <Button onClick={() => scrollTo(Math.max(activeIdx - 1, 0))} size="icon" variant="secondary" className="rounded-full shadow"><ChevronUp className="h-5 w-5" /></Button>
          <Button onClick={() => scrollTo(Math.min(activeIdx + 1, posts.length - 1))} size="icon" variant="secondary" className="rounded-full shadow"><ChevronDown className="h-5 w-5" /></Button>
        </div>
      )}

      {commentsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center z-50" onClick={() => setCommentsOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-[420px] sm:rounded-2xl rounded-t-3xl bg-card max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-bold">التعليقات</h3>
              <Button size="icon" variant="ghost" onClick={() => setCommentsOpen(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">كن أول من يعلق</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                   <Link to="/profile/$userId" params={{ userId: c.user_id }} aria-label={`فتح ملف ${c.profile?.full_name || "المستخدم"}`}>
                   <Avatar className="h-8 w-8">
                    <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">
                      {(c.profile?.full_name || "K").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                   </Link>
                  <div className="flex-1 rounded-2xl bg-muted px-3 py-2">
                     <Link to="/profile/$userId" params={{ userId: c.user_id }} className="text-xs font-bold hover:underline">{c.profile?.full_name || "مستخدم"}</Link>
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
