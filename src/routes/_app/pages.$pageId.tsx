import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Users2, Loader2, Settings, Trash2, Image as ImageIcon, Send,
  BarChart3, Heart, MessageCircle, Share2, Eye, FileText, UserCheck,
  Pencil, Globe, Calendar, Tag, ArrowRight, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_app/pages/$pageId")({ component: PageDetail });

const CATEGORIES = ["أعمال", "ترفيه", "تعليم", "تقنية", "رياضة", "أخبار", "فن", "طعام", "سفر", "موضة", "صحة", "أخرى"];

function PageDetail() {
  const { pageId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("posts");
  const [stats, setStats] = useState({ likes: 0, comments: 0 });

  const isOwner = !!(user && page && page.owner_id === user.id);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: ps }, { data: fs }] = await Promise.all([
      supabase.from("pages").select("*").eq("id", pageId).maybeSingle(),
      supabase.from("posts").select("*").eq("page_id" as any, pageId).order("created_at", { ascending: false }).limit(50),
      supabase.from("page_followers" as any).select("user_id, created_at").eq("page_id", pageId).order("created_at", { ascending: false }),
    ]);
    setPage(p);
    setPosts(ps || []);
    const list = (fs as any[]) || [];
    setFollowing(!!user && list.some((f: any) => f.user_id === user.id));

    // Load follower profiles
    if (list.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", list.map((f: any) => f.user_id));
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      setFollowers(list.map((f: any) => ({ ...f, profile: map.get(f.user_id) })));
    } else {
      setFollowers([]);
    }

    // Stats: likes + comments on this page's posts
    const postIds = (ps || []).map((x: any) => x.id);
    if (postIds.length) {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("post_likes").select("id", { count: "exact", head: true }).in("post_id", postIds),
        supabase.from("post_comments").select("id", { count: "exact", head: true }).in("post_id", postIds),
      ]);
      setStats({ likes: lc || 0, comments: cc || 0 });
    } else {
      setStats({ likes: 0, comments: 0 });
    }

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [pageId, user?.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`page-${pageId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "page_followers", filter: `page_id=eq.${pageId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [pageId]);

  async function toggleFollow() {
    if (!user) return toast.error("يجب تسجيل الدخول");
    if (following) {
      await supabase.from("page_followers" as any).delete().eq("page_id", pageId).eq("user_id", user.id);
    } else {
      await supabase.from("page_followers" as any).insert({ page_id: pageId, user_id: user.id } as any);
    }
  }

  async function sharePage() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: page.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط الصفحة");
    }
  }

  async function submitPost() {
    if (!user || !isOwner) return;
    if (!content.trim() && !postFile) return toast.error("اكتب شيئاً أو أضف صورة");
    setPosting(true);
    try {
      let image_url: string | null = null;
      if (postFile) {
        const path = `pages/${pageId}/posts/${Date.now()}-${postFile.name}`;
        const { error } = await supabase.storage.from("media").upload(path, postFile, { upsert: true });
        if (error) throw error;
        image_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        page_id: pageId,
        content: content.trim() || null,
        image_url,
      } as any);
      if (error) throw error;
      setContent(""); setPostFile(null);
      toast.success("تم النشر");
    } catch (e: any) { toast.error(e.message || "خطأ"); }
    finally { setPosting(false); }
  }

  async function deletePost(postId: string) {
    if (!confirm("حذف المنشور؟")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
  }

  async function deletePage() {
    if (!confirm("هل أنت متأكد من حذف الصفحة؟ لا يمكن التراجع.")) return;
    const { error } = await supabase.from("pages").delete().eq("id", pageId);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الصفحة");
    navigate({ to: "/pages" });
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!page) return <Card className="p-12 text-center text-muted-foreground mx-auto max-w-2xl mt-6">الصفحة غير موجودة</Card>;

  const followerCount = followers.length;

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 py-3 sm:py-4">
      {/* Back link */}
      <Link to="/pages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2">
        <ArrowRight className="h-4 w-4" /> كل الصفحات
      </Link>

      {/* Header */}
      <Card className="overflow-hidden shadow-card">
        <div className="h-40 sm:h-56 md:h-72 bg-brand-gradient relative">
          {page.cover_url && <img src={page.cover_url} alt="" className="h-full w-full object-cover" />}
          {isOwner && (
            <button
              onClick={() => setEditOpen(true)}
              className="absolute bottom-3 left-3 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-background shadow"
            >
              <Camera className="h-3.5 w-3.5" /> تعديل الغلاف
            </button>
          )}
        </div>
        <div className="p-3 sm:p-6 -mt-10 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-card">
                <AvatarImage src={page.avatar_url} />
                <AvatarFallback className="bg-accent text-primary text-2xl font-black">{(page.name || "P").slice(0, 2)}</AvatarFallback>
              </Avatar>
              {isOwner && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="absolute bottom-1 left-1 h-8 w-8 grid place-items-center rounded-full bg-background border shadow hover:bg-muted"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex-1 text-center sm:text-right min-w-0">
              <h1 className="text-xl sm:text-3xl font-black truncate">{page.name}</h1>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                {page.category && <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{page.category}</Badge>}
                <span className="flex items-center gap-1"><Users2 className="h-3.5 w-3.5" />{followerCount} متابع</span>
              </div>
              {page.description && <p className="text-sm mt-2 line-clamp-2">{page.description}</p>}
            </div>
            <div className="flex gap-2 justify-center sm:justify-end shrink-0">
              {isOwner ? (
                <>
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Settings className="h-4 w-4" /><span className="hidden sm:inline">تعديل</span></Button></DialogTrigger>
                    <EditPageDialog page={page} onSaved={() => { setEditOpen(false); load(); }} />
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={sharePage} className="gap-1"><Share2 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={deletePage} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <Button onClick={toggleFollow} variant={following ? "outline" : "default"} size="sm" className="gap-1">
                    {following ? <><UserCheck className="h-4 w-4" /> أتابع</> : <><Users2 className="h-4 w-4" /> متابعة</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={sharePage} className="gap-1"><Share2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Owner Quick Stats */}
      {isOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
          <StatCard icon={<Users2 className="h-4 w-4" />} label="المتابعون" value={followerCount} />
          <StatCard icon={<FileText className="h-4 w-4" />} label="المنشورات" value={posts.length} />
          <StatCard icon={<Heart className="h-4 w-4" />} label="الإعجابات" value={stats.likes} />
          <StatCard icon={<MessageCircle className="h-4 w-4" />} label="التعليقات" value={stats.comments} />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-3 sm:mt-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="about">حول</TabsTrigger>
          <TabsTrigger value="followers">المتابعون</TabsTrigger>
          {isOwner && <TabsTrigger value="insights"><BarChart3 className="h-4 w-4 ml-1" />الإحصائيات</TabsTrigger>}
          {isOwner && <TabsTrigger value="manage">الإدارة</TabsTrigger>}
        </TabsList>

        {/* POSTS */}
        <TabsContent value="posts" className="space-y-3 sm:space-y-4">
          {isOwner && (
            <Card className="p-3 sm:p-4 shadow-card">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={`انشر شيئاً باسم ${page.name}...`} rows={3} className="resize-none" />
              {postFile && (
                <div className="mt-2 flex items-center gap-2 text-xs bg-muted rounded p-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="truncate flex-1">{postFile.name}</span>
                  <button onClick={() => setPostFile(null)} className="text-destructive">إزالة</button>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 gap-2">
                <label className="cursor-pointer text-sm text-muted-foreground flex items-center gap-1 hover:text-primary">
                  <ImageIcon className="h-4 w-4" /> صورة
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPostFile(e.target.files?.[0] || null)} />
                </label>
                <Button onClick={submitPost} disabled={posting} size="sm" className="gap-2">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  نشر
                </Button>
              </div>
            </Card>
          )}

          {!posts.length ? (
            <Card className="p-12 text-center text-muted-foreground">لا توجد منشورات بعد</Card>
          ) : posts.map((p: any) => (
            <Card key={p.id} className="p-3 sm:p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={page.avatar_url} />
                  <AvatarFallback>{(page.name || "P").slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{page.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ar })}</p>
                </div>
                {isOwner && (
                  <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-destructive p-1" title="حذف">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {p.content && <p className="whitespace-pre-wrap mb-2 text-sm sm:text-base">{p.content}</p>}
              {p.image_url && <img src={p.image_url} alt="" className="rounded-lg w-full" />}
              {p.video_url && <video src={p.video_url} controls className="rounded-lg w-full" />}
            </Card>
          ))}
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about">
          <Card className="p-4 sm:p-6 space-y-3 shadow-card">
            <Row icon={<Globe className="h-4 w-4" />} label="الاسم" value={page.name} />
            {page.category && <Row icon={<Tag className="h-4 w-4" />} label="الفئة" value={page.category} />}
            {page.description && <Row icon={<FileText className="h-4 w-4" />} label="الوصف" value={page.description} />}
            <Row icon={<Calendar className="h-4 w-4" />} label="تاريخ الإنشاء" value={new Date(page.created_at).toLocaleDateString("ar")} />
            <Row icon={<Users2 className="h-4 w-4" />} label="المتابعون" value={String(followerCount)} />
          </Card>
        </TabsContent>

        {/* FOLLOWERS */}
        <TabsContent value="followers">
          <Card className="p-3 sm:p-4 shadow-card">
            {!followers.length ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد متابعون بعد</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {followers.map((f: any) => (
                  <Link key={f.user_id} to="/profile/$userId" params={{ userId: f.user_id }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={f.profile?.avatar_url} />
                      <AvatarFallback>{(f.profile?.full_name || "U").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{f.profile?.full_name || "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground truncate">@{f.profile?.username || "—"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* INSIGHTS */}
        {isOwner && (
          <TabsContent value="insights">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-4 shadow-card">
                <h3 className="font-bold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> الأداء العام</h3>
                <div className="space-y-2 text-sm">
                  <InsightRow label="إجمالي المتابعين" value={followerCount} />
                  <InsightRow label="إجمالي المنشورات" value={posts.length} />
                  <InsightRow label="متوسط الإعجابات/منشور" value={posts.length ? Math.round(stats.likes / posts.length) : 0} />
                  <InsightRow label="متوسط التعليقات/منشور" value={posts.length ? Math.round(stats.comments / posts.length) : 0} />
                </div>
              </Card>
              <Card className="p-4 shadow-card">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Eye className="h-4 w-4" /> أحدث النشاط</h3>
                {followers.slice(0, 5).length ? (
                  <ul className="space-y-2 text-sm">
                    {followers.slice(0, 5).map((f: any) => (
                      <li key={f.user_id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{f.profile?.full_name || "مستخدم"} بدأ بمتابعتك</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(f.created_at), { locale: ar })}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">لا يوجد نشاط</p>}
              </Card>
            </div>
          </TabsContent>
        )}

        {/* MANAGE */}
        {isOwner && (
          <TabsContent value="manage">
            <Card className="p-4 sm:p-6 shadow-card space-y-4">
              <div>
                <h3 className="font-bold mb-1 flex items-center gap-2"><Pencil className="h-4 w-4" /> معلومات الصفحة</h3>
                <p className="text-sm text-muted-foreground mb-2">عدّل اسم الصفحة وصورها ووصفها وفئتها.</p>
                <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2"><Settings className="h-4 w-4" /> تعديل المعلومات</Button>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-bold mb-1 flex items-center gap-2"><Share2 className="h-4 w-4" /> مشاركة الصفحة</h3>
                <p className="text-sm text-muted-foreground mb-2">انسخ رابط الصفحة لمشاركته مع الآخرين.</p>
                <Button variant="outline" onClick={sharePage} className="gap-2"><Share2 className="h-4 w-4" /> نسخ الرابط</Button>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-bold mb-1 text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> منطقة الخطر</h3>
                <p className="text-sm text-muted-foreground mb-2">حذف الصفحة نهائياً مع كل منشوراتها ومتابعيها.</p>
                <Button variant="destructive" onClick={deletePage} className="gap-2"><Trash2 className="h-4 w-4" /> حذف الصفحة</Button>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-3 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="text-xl sm:text-2xl font-black mt-1">{value}</p>
    </Card>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 grid place-items-center rounded-lg bg-muted shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function EditPageDialog({ page, onSaved }: { page: any; onSaved: () => void }) {
  const [name, setName] = useState(page.name || "");
  const [description, setDescription] = useState(page.description || "");
  const [category, setCategory] = useState(page.category || CATEGORIES[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFile(file: File, prefix: string) {
    const ext = file.name.split(".").pop();
    const path = `pages/${page.id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function save() {
    if (!name.trim()) return toast.error("الاسم مطلوب");
    setSaving(true);
    try {
      const updates: any = { name: name.trim(), description: description.trim() || null, category };
      if (avatarFile) updates.avatar_url = await uploadFile(avatarFile, "avatar");
      if (coverFile) updates.cover_url = await uploadFile(coverFile, "cover");
      const { error } = await supabase.from("pages").update(updates).eq("id", page.id);
      if (error) throw error;
      toast.success("تم التحديث");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>تعديل الصفحة</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">اسم الصفحة</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">الفئة</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">الوصف</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted">
            <Camera className="h-4 w-4" />
            <span className="text-xs text-center">{avatarFile ? "✓ صورة جديدة" : "تغيير الصورة"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </label>
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted">
            <Camera className="h-4 w-4" />
            <span className="text-xs text-center">{coverFile ? "✓ غلاف جديد" : "تغيير الغلاف"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التغييرات"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
