import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Send, Bookmark, Trash2, Copy,
  Loader2, Globe, Users as UsersIcon, Lock, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { backgroundStyle } from "@/components/PostComposer";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Profile { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null; verified_style?: string | null; }
interface Post {
  id: string; user_id: string; content: string | null; image_url: string | null;
  video_url: string | null; youtube_url: string | null; media_type: string | null;
  feeling: string | null; is_live: boolean | null; shares_count: number | null;
  background: string | null; privacy: string | null; location: string | null;
  created_at: string;
  profile?: Profile;
  likes_count: number; comments_count: number; liked_by_me: boolean;
}
interface Comment { id: string; post_id: string; user_id: string; content: string; created_at: string; profile?: Profile; }

export function UserPostsList({ userId, viewMode = "list", reloadKey = 0 }: { userId: string; viewMode?: "list" | "grid"; reloadKey?: number }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [likeSubmitting, setLikeSubmitting] = useState<Record<string, boolean>>({});

  const initials = (s?: string | null) => (s || "K").slice(0, 2).toUpperCase();

  const load = async () => {
    setLoading(true);
    const { data: rawPosts } = await supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (!rawPosts) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified, verified_style").eq("id", userId).maybeSingle();
    const postIds = rawPosts.map(p => p.id);
    const [{ data: likes }, { data: comments }] = await Promise.all([
      postIds.length ? supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from("post_comments").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    setPosts(rawPosts.map((p: any) => ({
      ...p,
      profile: profile || undefined,
      likes_count: (likes || []).filter((l: any) => l.post_id === p.id).length,
      comments_count: (comments || []).filter((c: any) => c.post_id === p.id).length,
      liked_by_me: !!(likes || []).find((l: any) => l.post_id === p.id && l.user_id === user?.id),
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("id, full_name, username, avatar_url, verified").eq("id", user.id).maybeSingle()
        .then(({ data }) => setMyProfile(data));
    }
    load();
    const ch = supabase.channel(`user-posts-${userId}-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, user?.id, reloadKey]);

  const toggleLike = async (post: Post) => {
    if (!user || likeSubmitting[post.id]) return;
    setLikeSubmitting(s => ({ ...s, [post.id]: true }));
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) } : p));
    if (post.liked_by_me) await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    else await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    setLikeSubmitting(s => ({ ...s, [post.id]: false }));
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/home#post-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "منشور على KAIAN", text: post.content || "", url });
      else { await navigator.clipboard.writeText(url); toast.success("تم نسخ الرابط"); }
      if (user) {
        const { error } = await supabase.from("post_shares").insert({ post_id: post.id, user_id: user.id });
        if (!error) toast.success("🎉 حصلت على 1$ في محفظتك");
      }
    } catch {}
  };

  const deletePost = async (id: string) => {
    if (!confirm("هل تريد حذف هذا المنشور؟")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error("تعذر الحذف");
    setPosts(p => p.filter(x => x.id !== id));
    toast.success("تم الحذف");
  };

  const toggleComments = async (postId: string) => {
    const next = !openComments[postId];
    setOpenComments({ ...openComments, [postId]: next });
    if (next && !commentsByPost[postId]) {
      const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      if (!data) return;
      const ids = [...new Set(data.map(c => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", ids);
      const pmap = new Map((profs || []).map(p => [p.id, p]));
      setCommentsByPost(prev => ({ ...prev, [postId]: data.map(c => ({ ...c, profile: pmap.get(c.user_id) })) }));
    }
  };

  const submitComment = async (postId: string) => {
    const txt = (commentText[postId] || "").trim();
    if (!txt || !user || commentSubmitting[postId]) return;
    setCommentSubmitting(s => ({ ...s, [postId]: true }));
    const { data, error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content: txt }).select("*").single();
    setCommentSubmitting(s => ({ ...s, [postId]: false }));
    if (error || !data) return toast.error("تعذر التعليق");
    setCommentText({ ...commentText, [postId]: "" });
    setCommentsByPost(prev => ({ ...prev, [postId]: [...(prev[postId] || []), { ...(data as Comment), profile: myProfile || undefined }] }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
  };

  if (loading) return <Card className="p-12 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></Card>;
  if (posts.length === 0) return <Card className="p-12 text-center text-muted-foreground shadow-card">لا توجد منشورات بعد</Card>;

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {posts.map(p => (
          <div key={p.id} className="aspect-square relative rounded-xl overflow-hidden bg-muted group">
            {p.image_url ? (
              <img src={p.image_url} className="w-full h-full object-cover" alt="" />
            ) : p.background ? (
              <div className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-bold" style={backgroundStyle(p.background) ?? undefined}>{p.content?.slice(0, 80)}</div>
            ) : (
              <div className="w-full h-full p-3 text-xs flex items-center justify-center text-center">{p.content?.slice(0, 80) || "—"}</div>
            )}
            {p.user_id === user?.id && (
              <button onClick={() => deletePost(p.id)} className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {posts.map(post => (
          <motion.div key={post.id} id={`post-${post.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={post.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(post.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm">{post.profile?.full_name || "مستخدم"}</span>
                      {post.profile?.verified && <VerifiedBadge style={(post.profile?.verified_style as any) || "brand"} size={14} />}
                      {post.feeling && <span className="text-xs text-muted-foreground">— يشعر بـ {post.feeling}</span>}
                      {post.location && <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">— <MapPin className="h-3 w-3" />{post.location}</span>}
                      {post.is_live && <span className="rounded bg-red-600 text-white text-[10px] px-1.5 py-0.5 animate-pulse">🔴 مباشر</span>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ar })}
                      <span>·</span>
                      {post.privacy === "only_me" ? <Lock className="h-3 w-3" /> : post.privacy === "friends" ? <UsersIcon className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/home#post-${post.id}`); toast.success("نُسخ الرابط"); }}>
                      <Copy className="ms-2 h-4 w-4" />نسخ الرابط
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("تم الحفظ")}><Bookmark className="ms-2 h-4 w-4" />حفظ</DropdownMenuItem>
                    {post.user_id === user?.id && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deletePost(post.id)} className="text-destructive"><Trash2 className="ms-2 h-4 w-4" />حذف</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {post.content && (
                post.background && !post.image_url && !post.video_url && !post.youtube_url ? (
                  <div className="mt-3 rounded-xl min-h-[220px] flex items-center justify-center p-6 text-center text-2xl font-bold whitespace-pre-wrap break-words" style={backgroundStyle(post.background) ?? undefined}>
                    {post.content}
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )
              )}
              {post.image_url && <img src={post.image_url} className="mt-3 w-full rounded-xl" alt="" />}
              {post.video_url && <video src={post.video_url} controls className="mt-3 w-full rounded-xl" />}
              {post.youtube_url && (
                <div className="mt-3 aspect-video w-full rounded-xl overflow-hidden">
                  <iframe className="h-full w-full" src={post.youtube_url} allowFullScreen />
                </div>
              )}

              {(post.likes_count > 0 || post.comments_count > 0 || (post.shares_count || 0) > 0) && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{post.likes_count} إعجاب</span>
                  <span>{post.comments_count} تعليق • {post.shares_count || 0} مشاركة</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-around border-t pt-2">
                <Button variant="ghost" size="sm" disabled={likeSubmitting[post.id]} onClick={() => toggleLike(post)} className={`gap-2 flex-1 ${post.liked_by_me ? "text-primary" : ""}`}>
                  <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />إعجاب
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 flex-1" onClick={() => toggleComments(post.id)}><MessageCircle className="h-4 w-4" />تعليق</Button>
                <Button variant="ghost" size="sm" className="gap-2 flex-1" onClick={() => sharePost(post)}><Share2 className="h-4 w-4" />مشاركة</Button>
              </div>

              {openComments[post.id] && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  {(commentsByPost[post.id] || []).map(c => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{initials(c.profile?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 rounded-2xl bg-muted px-3 py-2">
                        <p className="text-xs font-bold">{c.profile?.full_name || "مستخدم"}</p>
                        <p className="text-sm">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={myProfile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{initials(myProfile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <Input
                      value={commentText[post.id] || ""}
                      onChange={e => setCommentText({ ...commentText, [post.id]: e.target.value })}
                      onKeyDown={e => { if (e.key === "Enter") submitComment(post.id); }}
                      placeholder="اكتب تعليقًا..."
                      className="rounded-full bg-muted border-0"
                    />
                    <Button size="icon" disabled={commentSubmitting[post.id] || !(commentText[post.id] || "").trim()} onClick={() => submitComment(post.id)} className="rounded-full">
                      {commentSubmitting[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
