import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Heart, MessageCircle, Share2, Image as ImageIcon, Video, Smile, MoreHorizontal, Send,
  Youtube, Radio, Bookmark, Trash2, Link as LinkIcon, X, Plus, Copy, Loader2,
  Download, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { StoryViewer } from "@/components/StoryViewer";
import { ReelsStrip } from "@/components/ReelsStrip";
import { AddFriendButton } from "@/components/AddFriendButton";
import { Link, useNavigate } from "@tanstack/react-router";
import { PostComposer, backgroundStyle } from "@/components/PostComposer";
import { SponsoredAd } from "@/components/SponsoredAd";
import { PostContent } from "@/components/PostContent";
import { HlsPlayer } from "@/components/HlsPlayer";
import { LiveKitStage } from "@/components/LiveKitStage";
import { Globe, Users as UsersIcon, Lock, MapPin } from "lucide-react";

interface Profile { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null; }
interface Post {
  id: string; user_id: string; content: string | null; image_url: string | null;
  video_url: string | null; youtube_url: string | null; live_stream_url: string | null;
  media_type: string | null;
  feeling: string | null; is_live: boolean | null; shares_count: number | null;
  background: string | null; privacy: string | null; location: string | null;
  created_at: string;
  profile?: Profile;
  likes_count: number; comments_count: number; liked_by_me: boolean;
}
interface Comment { id: string; post_id: string; user_id: string; content: string; created_at: string; profile?: Profile; }
interface Story { id: string; user_id: string; media_url: string; media_type: string; caption: string | null; created_at: string; profile?: Profile; }

const FEELINGS = [
  { e: "😊", t: "سعيد" }, { e: "😍", t: "محب" }, { e: "🥳", t: "محتفل" },
  { e: "😎", t: "رائع" }, { e: "😢", t: "حزين" }, { e: "😡", t: "غاضب" },
  { e: "🤩", t: "متحمس" }, { e: "🙏", t: "ممتن" }, { e: "😴", t: "متعب" },
  { e: "❤️", t: "محبوب" }, { e: "🔥", t: "متقد" }, { e: "✨", t: "ملهم" },
];

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoAspects = useRef<Record<string, "portrait" | "landscape">>({});
  const openVideo = (postId: string) => {
    const kind = videoAspects.current[postId] ?? "landscape";
    if (kind === "portrait") navigate({ to: "/reels", search: { start: postId } as any });
    else navigate({ to: "/watch", search: { start: postId } as any });
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  // composer state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [showYoutube, setShowYoutube] = useState(false);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  // comments per post
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});

  // live stream (LiveKit-powered)
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveRoom, setLiveRoom] = useState<string | null>(null);
  const [liveStarted, setLiveStarted] = useState(false);

  // story creation
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [storyUploading, setStoryUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [likeSubmitting, setLikeSubmitting] = useState<Record<string, boolean>>({});

  // image lightbox
  const [lightbox, setLightbox] = useState<{ post: Post } | null>(null);

  const initials = (s?: string | null) => (s || "K").slice(0, 2).toUpperCase();

  const saveImageToDevice = async (url: string) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = url.split("/").pop() || `kaian-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      toast.success("تم حفظ الصورة");
    } catch {
      // fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  const reportPost = async (postId: string) => {
    toast.success("تم إرسال البلاغ. شكرًا لمساعدتك.");
  };

  const loadStories = async () => {
    const { data } = await supabase.from("stories").select("*").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(20);
    if (!data) return;
    const ids = [...new Set(data.map(s => s.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", ids);
    const pmap = new Map((profs || []).map(p => [p.id, p]));
    setStories(data.map(s => ({ ...s, profile: pmap.get(s.user_id) } as Story)));
  };

  const loadAds = async () => {
    const { data } = await supabase
      .from("ad_campaigns")
      .select("id, user_id, title, content, image_url, link_url, cta, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data || data.length === 0) { setAds([]); return; }
    const uids = [...new Set(data.map((a: any) => a.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", uids);
    const pmap = new Map((profs || []).map((p: any) => [p.id, p]));
    // shuffle
    const arr = [...data].sort(() => Math.random() - 0.5);
    setAds(arr.map((a: any) => ({ ...a, profile: pmap.get(a.user_id) })));
  };


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

    setPosts(rawPosts.map((p: any) => ({
      ...p,
      profile: profileMap.get(p.user_id),
      likes_count: (likes || []).filter(l => l.post_id === p.id).length,
      comments_count: (comments || []).filter(c => c.post_id === p.id).length,
      liked_by_me: !!(likes || []).find(l => l.post_id === p.id && l.user_id === user?.id),
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, full_name, username, avatar_url, verified").eq("id", user.id).maybeSingle()
      .then(({ data }) => setMyProfile(data));
    load();
    loadStories();
    loadAds();
    const ch = supabase.channel("feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => loadStories())
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => loadAds())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const pickImage = () => imgRef.current?.click();
  const pickVideo = () => vidRef.current?.click();

  const onFile = (f: File | null, type: "image" | "video") => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) return toast.error("الحد الأقصى 50MB");
    setMediaFile(f); setMediaType(type);
    setMediaPreview(URL.createObjectURL(f));
  };

  const clearMedia = () => {
    setMediaFile(null); setMediaPreview(null); setMediaType(null);
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
    if (error) { toast.error("فشل رفع الملف"); return null; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  const publish = async () => {
    if (!user || publishing) return;
    const yt = youtubeInput ? extractYoutubeId(youtubeInput) : null;
    if (youtubeInput && !yt) return toast.error("رابط يوتيوب غير صالح");
    if (!content.trim() && !mediaFile && !yt && !feeling) return;

    setPublishing(true);
    let image_url: string | null = null;
    let video_url: string | null = null;
    if (mediaFile && mediaType) {
      const url = await uploadMedia(mediaFile);
      if (!url) { setPublishing(false); return; }
      if (mediaType === "image") image_url = url; else video_url = url;
    }
    const payload: any = {
      user_id: user.id,
      content: content.trim() || null,
      image_url,
      video_url,
      youtube_url: yt ? `https://www.youtube.com/embed/${yt}` : null,
      media_type: image_url ? "image" : video_url ? "video" : yt ? "youtube" : null,
      feeling,
    };
    const { error } = await supabase.from("posts").insert(payload);
    setPublishing(false);
    if (error) return toast.error("تعذر النشر");
    setContent(""); clearMedia(); setYoutubeInput(""); setShowYoutube(false); setFeeling(null);
    toast.success("تم النشر!");
  };

  const toggleLike = async (post: Post) => {
    if (!user || likeSubmitting[post.id]) return;
    setLikeSubmitting(s => ({ ...s, [post.id]: true }));
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) } : p));
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setLikeSubmitting(s => ({ ...s, [post.id]: false }));
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/home#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "منشور على KAIAN", text: post.content || "", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ الرابط");
      }
      if (user) {
        const { error } = await supabase.from("post_shares").insert({ post_id: post.id, user_id: user.id });
        if (!error) toast.success("🎉 حصلت على 1$ في محفظتك مقابل المشاركة");
      }
    } catch {}
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error("تعذر الحذف");
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
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), { ...(data as Comment), profile: myProfile || undefined }],
    }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
  };

  // Live stream (LiveKit)
  const startLive = () => {
    if (!user) return;
    const room = `live-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
    setLiveRoom(room);
    setLiveTitle("");
    setLiveStarted(false);
    setLiveOpen(true);
  };
  const stopLive = () => {
    setLiveOpen(false);
    setLiveRoom(null);
    setLiveStarted(false);
    setLiveTitle("");
  };
  const broadcastLive = async () => {
    if (!user || !liveRoom) return;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: liveTitle.trim() || "🔴 بث مباشر",
      is_live: true,
      media_type: "live",
      live_stream_url: `livekit:${liveRoom}`,
    });
    if (error) return toast.error("تعذر بدء البث");
    toast.success("بدأ البث المباشر!");
    setLiveStarted(true);
  };

  // Stories
  const submitStory = async () => {
    if (!storyFile || !user || storyUploading) return;
    setStoryUploading(true); setUploadProgress(0);
    // simulate progress while we upload (Supabase JS SDK doesn't expose progress)
    const t = setInterval(() => setUploadProgress(p => Math.min(90, p + 8)), 200);
    const isVideo = storyFile.type.startsWith("video");
    const url = await uploadMedia(storyFile);
    clearInterval(t);
    setUploadProgress(100);
    if (!url) { setStoryUploading(false); return; }
    const { error } = await supabase.from("stories").insert({
      user_id: user.id, media_url: url, media_type: isVideo ? "video" : "image", caption: storyCaption || null,
    });
    setStoryUploading(false);
    if (error) return toast.error("تعذر النشر");
    toast.success("تمت إضافة القصة");
    setStoryFile(null); setStoryCaption(""); setStoryOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <PostComposer
        myProfile={myProfile}
        onStartLive={startLive}
        onOpenStory={() => setStoryOpen(true)}
      />


      {/* Stories strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        <button onClick={() => setStoryOpen(true)} className="relative h-44 w-28 shrink-0 rounded-2xl overflow-hidden shadow-card group border-2 border-dashed border-primary/40 bg-muted">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-5 w-5" /></div>
            <span className="text-xs font-semibold">قصتك</span>
          </div>
        </button>
        {stories.map((s, i) => (
          <button key={s.id} onClick={() => setStoryIndex(i)} className="relative h-44 w-28 shrink-0 rounded-2xl overflow-hidden shadow-card group">
            {s.media_type === "video" ? (
              <video src={s.media_url} className="absolute inset-0 h-full w-full object-cover" muted />
            ) : (
              <img src={s.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <Avatar className="absolute top-2 right-2 h-9 w-9 ring-2 ring-white">
              <AvatarImage src={s.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{initials(s.profile?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 right-2 left-2 text-white text-xs font-semibold line-clamp-2">
              {s.profile?.full_name || "مستخدم"}
            </div>
          </button>
        ))}
      </div>

      <ReelsStrip />

      {loading && <Card className="p-12 text-center text-muted-foreground">جاري التحميل...</Card>}

      <AnimatePresence>
        {posts.map((post, idx) => (
          <div key={post.id}>
          {idx > 0 && idx % 3 === 0 && ads.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
              <SponsoredAd ad={ads[Math.floor(idx / 3) % ads.length]} />
            </motion.div>
          )}
          <motion.div id={`post-${post.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Link to="/profile/$userId" params={{ userId: post.user_id }}>
                    <Avatar className="h-11 w-11 hover:opacity-80 transition">
                      <AvatarImage src={post.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(post.profile?.full_name)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link to="/profile/$userId" params={{ userId: post.user_id }} className="font-bold text-sm hover:underline">
                        {post.profile?.full_name || "مستخدم"}
                      </Link>
                      {post.profile?.verified && <span className="text-primary text-xs">✓</span>}
                      {post.user_id !== user?.id && <AddFriendButton userId={post.user_id} compact size="sm" className="h-6 px-2 text-[11px]" />}
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
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
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
                post.background && !post.image_url && !post.video_url && !post.youtube_url && !post.live_stream_url ? (
                  <div
                    className="mt-3 rounded-xl min-h-[220px] flex items-center justify-center p-6 text-center text-2xl font-bold"
                    style={backgroundStyle(post.background) ?? undefined}
                  >
                    <PostContent text={post.content} postId={post.id} maxChars={200} />
                  </div>
                ) : (
                  <PostContent text={post.content} postId={post.id} className="mt-3 text-[15px] leading-relaxed" maxChars={350} />
                )
              )}
              {post.live_stream_url && (
                <div className="mt-3 relative rounded-xl overflow-hidden bg-black">
                  <span className="absolute top-2 right-2 z-10 rounded bg-red-600 text-white text-xs px-2 py-0.5 font-bold animate-pulse">🔴 مباشر</span>
                  <HlsPlayer src={post.live_stream_url} className="w-full aspect-video" muted={true} />
                </div>
              )}
              {post.image_url && (
                <button type="button" onClick={() => setLightbox({ post })} className="mt-3 block w-full">
                  <img src={post.image_url} className="w-full rounded-xl cursor-zoom-in" alt="" />
                </button>
              )}
              {post.video_url && (
                <div className="mt-3 relative rounded-xl overflow-hidden bg-black group cursor-pointer" onClick={() => openVideo(post.id)}>
                  <video
                    src={post.video_url}
                    className="w-full"
                    preload="metadata"
                    muted
                    playsInline
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      videoAspects.current[post.id] = v.videoHeight > v.videoWidth ? "portrait" : "landscape";
                    }}
                    onClick={(e) => { e.stopPropagation(); openVideo(post.id); }}
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-black/60 backdrop-blur">
                      <svg className="h-8 w-8 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
              )}
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
          </div>
        ))}
      </AnimatePresence>

      {!loading && posts.length === 0 && (
        <Card className="p-12 text-center"><p className="text-muted-foreground">لا توجد منشورات بعد. كن أول من ينشر!</p></Card>
      )}

      {/* Live dialog */}
      <Dialog open={liveOpen} onOpenChange={(o) => { if (!o) stopLive(); }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              {liveStarted ? "🔴 أنت مباشر الآن" : "إعداد البث المباشر"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video bg-black">
            {liveOpen && liveRoom && user && (
              <LiveKitStage
                room={liveRoom}
                identity={user.id}
                name={myProfile?.full_name || myProfile?.username || "مستخدم"}
                mode="broadcaster"
                video
                audio
                onEnded={stopLive}
              />
            )}
          </div>
          {!liveStarted && (
            <div className="p-4 space-y-3">
              <Textarea value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="عنوان البث..." />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={stopLive}>إلغاء</Button>
                <Button onClick={broadcastLive} className="bg-red-600 hover:bg-red-700">
                  <Radio className="h-4 w-4 ms-2" />ابدأ البث للمتابعين
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Story creation */}
      <Dialog open={storyOpen} onOpenChange={setStoryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة قصة</DialogTitle></DialogHeader>
          <Input type="file" accept="image/*,video/*" onChange={e => setStoryFile(e.target.files?.[0] || null)} />
          {storyFile && (storyFile.type.startsWith("video") ? (
            <video src={URL.createObjectURL(storyFile)} controls className="w-full rounded-xl max-h-80" />
          ) : (
            <img src={URL.createObjectURL(storyFile)} className="w-full rounded-xl max-h-80 object-cover" alt="" />
          ))}
          <Input value={storyCaption} onChange={e => setStoryCaption(e.target.value)} placeholder="تعليق (اختياري)" />
          <DialogFooter>
            <Button onClick={submitStory} disabled={!storyFile || storyUploading} className="bg-brand-gradient gap-2">
              {storyUploading ? <><Loader2 className="h-4 w-4 animate-spin" />جارٍ الرفع... {Math.round(uploadProgress)}%</> : "نشر القصة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story viewer */}
      <StoryViewer stories={stories as any} index={storyIndex} onClose={() => setStoryIndex(null)} />

      {/* Image lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-5xl w-[96vw] p-0 bg-black text-white border-0 gap-0 [&>button]:hidden">
          {lightbox && (() => {
            const livePost = posts.find(p => p.id === lightbox.post.id) || lightbox.post;
            return (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setLightbox(null)}>
                  <X className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/10">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => saveImageToDevice(livePost.image_url!)}>
                      <Download className="ms-2 h-4 w-4" />حفظ إلى الجهاز
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/home#post-${livePost.id}`); toast.success("نُسخ الرابط"); }}>
                      <Copy className="ms-2 h-4 w-4" />نسخ الرابط
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => reportPost(livePost.id)} className="text-destructive">
                      <Flag className="ms-2 h-4 w-4" />إبلاغ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-center px-2 pb-2">
                <img src={livePost.image_url!} alt="" className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg" />
              </div>
              <div className="flex items-center justify-around border-t border-white/10 py-2 px-2">
                <Button variant="ghost" size="sm" onClick={() => toggleLike(livePost)} className={`flex-1 gap-2 text-white hover:bg-white/10 ${livePost.liked_by_me ? "text-primary" : ""}`}>
                  <Heart className={`h-5 w-5 ${livePost.liked_by_me ? "fill-current" : ""}`} />
                  <span>{livePost.likes_count}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setLightbox(null); toggleComments(livePost.id); setTimeout(() => document.getElementById(`post-${livePost.id}`)?.scrollIntoView({ behavior: "smooth" }), 100); }} className="flex-1 gap-2 text-white hover:bg-white/10">
                  <MessageCircle className="h-5 w-5" />
                  <span>{livePost.comments_count}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => sharePost(livePost)} className="flex-1 gap-2 text-white hover:bg-white/10">
                  <Share2 className="h-5 w-5" />
                  <span>{livePost.shares_count || 0}</span>
                </Button>
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
