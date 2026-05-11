import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Video, Smile, MoreHorizontal, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface Profile { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null; }
interface Post { id: string; user_id: string; content: string | null; image_url: string | null; created_at: string; profile?: Profile; likes_count: number; comments_count: number; liked_by_me: boolean; }

export function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: rawPosts } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (!rawPosts) { setLoading(false); return; }
    const userIds = [...new Set(rawPosts.map(p => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const postIds = rawPosts.map(p => p.id);
    const { data: likes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds);
    const { data: comments } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);

    const enriched: Post[] = rawPosts.map(p => ({
      ...p,
      profile: profileMap.get(p.user_id),
      likes_count: (likes || []).filter(l => l.post_id === p.id).length,
      comments_count: (comments || []).filter(c => c.post_id === p.id).length,
      liked_by_me: !!(likes || []).find(l => l.post_id === p.id && l.user_id === user?.id),
    }));
    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, full_name, username, avatar_url, verified").eq("id", user.id).maybeSingle()
      .then(({ data }) => setMyProfile(data));
    load();
    const ch = supabase.channel("feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const publish = async () => {
    if (!content.trim() || !user) return;
    const { error } = await supabase.from("posts").insert({ user_id: user.id, content: content.trim() });
    if (error) return toast.error("تعذر النشر");
    setContent("");
    toast.success("تم النشر!");
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p,
      liked_by_me: !p.liked_by_me,
      likes_count: p.likes_count + (p.liked_by_me ? -1 : 1),
    } : p));
  };

  const initials = (s?: string | null) => (s || "K").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Composer */}
      <Card className="p-4 shadow-card">
        <div className="flex gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={myProfile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(myProfile?.full_name)}</AvatarFallback>
          </Avatar>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="ماذا يدور في بالك؟ #هاشتاج .. @إشارة .."
            className="flex-1 min-h-[60px] resize-none border-0 bg-muted/50 rounded-2xl focus-visible:ring-1"
          />
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="gap-2"><ImageIcon className="h-4 w-4 text-primary" />صورة</Button>
            <Button variant="ghost" size="sm" className="gap-2"><Video className="h-4 w-4 text-primary" />فيديو</Button>
            <Button variant="ghost" size="sm" className="gap-2"><Smile className="h-4 w-4 text-primary" />شعور</Button>
          </div>
          <Button onClick={publish} disabled={!content.trim()} className="rounded-full bg-brand-gradient px-6 font-bold shadow-elegant">
            <Send className="h-4 w-4 ms-2" />نشر
          </Button>
        </div>
      </Card>

      {/* Stories strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="relative h-44 w-28 shrink-0 rounded-2xl overflow-hidden shadow-card cursor-pointer group">
            <div className="absolute inset-0 bg-brand-gradient opacity-90" style={{ filter: `hue-rotate(${i*30}deg)` }} />
            <div className="absolute bottom-2 right-2 left-2 text-primary-foreground text-xs font-semibold">قصة {i}</div>
            <div className="absolute top-2 right-2 h-9 w-9 rounded-full ring-2 ring-white bg-white/30 backdrop-blur" />
          </div>
        ))}
      </div>

      {loading && <Card className="p-12 text-center text-muted-foreground">جاري التحميل...</Card>}

      <AnimatePresence>
        {posts.map(post => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={post.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(post.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm">{post.profile?.full_name || "مستخدم"}</p>
                      {post.profile?.verified && <span className="text-primary text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>

              {post.content && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}
              {post.image_url && <img src={post.image_url} className="mt-3 w-full rounded-xl" alt="" />}

              {(post.likes_count > 0 || post.comments_count > 0) && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{post.likes_count} إعجاب</span>
                  <span>{post.comments_count} تعليق</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-around border-t pt-2">
                <Button variant="ghost" size="sm" onClick={() => toggleLike(post)} className={`gap-2 flex-1 ${post.liked_by_me ? "text-primary" : ""}`}>
                  <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                  إعجاب
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 flex-1"><MessageCircle className="h-4 w-4" />تعليق</Button>
                <Button variant="ghost" size="sm" className="gap-2 flex-1"><Share2 className="h-4 w-4" />مشاركة</Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {!loading && posts.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">لا توجد منشورات بعد. كن أول من ينشر!</p>
        </Card>
      )}
    </div>
  );
}
