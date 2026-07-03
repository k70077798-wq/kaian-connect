import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share2, ArrowRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { PostContent } from "@/components/PostContent";
import { HlsPlayer } from "@/components/HlsPlayer";
import { backgroundStyle } from "@/components/PostComposer";

export const Route = createFileRoute("/_app/post/$postId")({ component: PostDetailPage });

function PostDetailPage() {
  const { postId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    if (!p) { setLoading(false); return; }
    setPost(p);
    const [{ data: pr }, { data: cs }, { data: ls }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, username, avatar_url, verified").eq("id", p.user_id).maybeSingle(),
      supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true }),
      supabase.from("post_likes").select("user_id").eq("post_id", postId),
    ]);
    setProfile(pr);
    setLikes((ls || []).length);
    setLikedByMe(!!(ls || []).find(l => l.user_id === user?.id));
    if (cs && cs.length) {
      const ids = [...new Set(cs.map(c => c.user_id))];
      const { data: cp } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
      const pmap = new Map((cp || []).map(x => [x.id, x]));
      setComments(cs.map(c => ({ ...c, profile: pmap.get(c.user_id) })));
    } else setComments([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [postId, user?.id]);

  const toggleLike = async () => {
    if (!user) return;
    setLikedByMe(v => !v);
    setLikes(n => n + (likedByMe ? -1 : 1));
    if (likedByMe) await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    else await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  };

  const submitComment = async () => {
    const txt = newComment.trim();
    if (!txt || !user || submitting) return;
    setSubmitting(true);
    const { data } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content: txt }).select("*").single();
    setSubmitting(false);
    if (data) {
      const { data: pr } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", user.id).maybeSingle();
      setComments(prev => [...prev, { ...data, profile: pr }]);
      setNewComment("");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "منشور KAIAN" });
      else { await navigator.clipboard.writeText(url); toast.success("تم نسخ الرابط"); }
    } catch { /* noop */ }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!post) return <Card className="p-12 text-center text-muted-foreground mx-auto max-w-2xl mt-6">المنشور غير موجود</Card>;

  const initials = (profile?.full_name || "K").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-2 sm:px-4 py-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/home" })} className="gap-2">
        <ArrowRight className="h-4 w-4" /> العودة
      </Button>

      <Card className="p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Link to="/profile/$userId" params={{ userId: post.user_id }}>
            <Avatar className="h-11 w-11">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link to="/profile/$userId" params={{ userId: post.user_id }} className="font-bold text-sm hover:underline">
              {profile?.full_name || "مستخدم"}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ar })}
            </p>
          </div>
        </div>

        {post.content && (
          post.background && !post.image_url && !post.video_url && !post.youtube_url && !post.live_stream_url ? (
            <div className="mt-3 rounded-xl min-h-[220px] flex items-center justify-center p-6 text-center text-2xl font-bold" style={backgroundStyle(post.background) ?? undefined}>
              <PostContent text={post.content} postId={post.id} showMore={false} maxChars={9999} />
            </div>
          ) : (
            <PostContent text={post.content} className="mt-3 text-[15px] leading-relaxed" postId={post.id} showMore={false} maxChars={9999} />
          )
        )}

        {post.live_stream_url && (
          <div className="mt-3 rounded-xl overflow-hidden bg-black relative">
            <span className="absolute top-2 right-2 z-10 rounded bg-red-600 text-white text-xs px-2 py-0.5 font-bold animate-pulse">🔴 مباشر</span>
            <HlsPlayer src={post.live_stream_url} className="w-full aspect-video" muted={false} />
          </div>
        )}
        {post.image_url && <img src={post.image_url} className="mt-3 w-full rounded-xl" alt="" />}
        {post.video_url && <video src={post.video_url} controls className="mt-3 w-full rounded-xl bg-black" />}
        {post.youtube_url && (
          <div className="mt-3 aspect-video w-full rounded-xl overflow-hidden">
            <iframe className="h-full w-full" src={post.youtube_url} allowFullScreen />
          </div>
        )}

        <div className="mt-3 flex items-center justify-around border-t pt-2">
          <Button variant="ghost" size="sm" onClick={toggleLike} className={`gap-2 flex-1 ${likedByMe ? "text-primary" : ""}`}>
            <Heart className={`h-4 w-4 ${likedByMe ? "fill-current" : ""}`} /> إعجاب ({likes})
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 flex-1">
            <MessageCircle className="h-4 w-4" /> تعليق ({comments.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={share} className="gap-2 flex-1">
            <Share2 className="h-4 w-4" /> مشاركة
          </Button>
        </div>
      </Card>

      <Card className="p-4 shadow-card space-y-3">
        <h3 className="font-bold">التعليقات</h3>
        {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">كن أول من يعلق</p>}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={c.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{(c.profile?.full_name || "K").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-2xl bg-muted px-3 py-2">
              <p className="text-xs font-bold">{c.profile?.full_name || "مستخدم"}</p>
              <PostContent text={c.content} className="text-sm" showMore={false} maxChars={9999} />
            </div>
          </div>
        ))}
        {user && (
          <div className="flex gap-2 pt-2 border-t">
            <Input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && submitComment()} placeholder="اكتب تعليقاً..." className="rounded-full bg-muted border-0" />
            <Button size="icon" disabled={submitting || !newComment.trim()} onClick={submitComment} className="rounded-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
