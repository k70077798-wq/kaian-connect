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
import { Camera, Users2, Loader2, Settings, Trash2, Image as ImageIcon, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_app/pages/$pageId")({ component: PageDetail });

function PageDetail() {
  const { pageId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isOwner = user && page && page.owner_id === user.id;

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: ps }, { data: fs }] = await Promise.all([
      supabase.from("pages").select("*").eq("id", pageId).maybeSingle(),
      supabase.from("posts").select("*").eq("page_id" as any, pageId).order("created_at", { ascending: false }).limit(30),
      supabase.from("page_followers" as any).select("user_id").eq("page_id", pageId),
    ]);
    setPage(p);
    setPosts(ps || []);
    const list = (fs as any[]) || [];
    setFollowerCount(list.length);
    setFollowing(!!user && list.some((f: any) => f.user_id === user.id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [pageId, user?.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`page-${pageId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "page_followers", filter: `page_id=eq.${pageId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pageId]);

  async function toggleFollow() {
    if (!user) return toast.error("يجب تسجيل الدخول");
    if (following) {
      await supabase.from("page_followers" as any).delete().eq("page_id", pageId).eq("user_id", user.id);
    } else {
      await supabase.from("page_followers" as any).insert({ page_id: pageId, user_id: user.id } as any);
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

  async function deletePage() {
    if (!confirm("هل أنت متأكد من حذف الصفحة؟")) return;
    const { error } = await supabase.from("pages").delete().eq("id", pageId);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الصفحة");
    navigate({ to: "/pages" });
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!page) return <Card className="p-12 text-center text-muted-foreground mx-auto max-w-2xl mt-6">الصفحة غير موجودة</Card>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <Card className="overflow-hidden shadow-card">
        <div className="h-48 sm:h-64 bg-brand-gradient relative">
          {page.cover_url && <img src={page.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="p-4 sm:p-6 -mt-12 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-card">
              <AvatarImage src={page.avatar_url} />
              <AvatarFallback className="bg-accent text-primary text-2xl font-black">{(page.name || "P").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-black">{page.name}</h1>
              <p className="text-sm text-muted-foreground">{page.category} · <Users2 className="inline h-3 w-3" /> {followerCount} متابع</p>
              {page.description && <p className="text-sm mt-1">{page.description}</p>}
            </div>
            <div className="flex gap-2">
              {isOwner ? (
                <>
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild><Button variant="outline" className="gap-2"><Settings className="h-4 w-4" /> تعديل</Button></DialogTrigger>
                    <EditPageDialog page={page} onSaved={() => { setEditOpen(false); load(); }} />
                  </Dialog>
                  <Button variant="outline" onClick={deletePage} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </>
              ) : (
                <Button onClick={toggleFollow} variant={following ? "outline" : "default"}>
                  {following ? "أتابع ✓" : "متابعة"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="posts" className="mt-4">
        <TabsList>
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="about">حول</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {isOwner && (
            <Card className="p-4 shadow-card">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={`انشر شيئاً باسم ${page.name}...`} rows={3} />
              <div className="flex items-center justify-between mt-2">
                <label className="cursor-pointer text-sm text-muted-foreground flex items-center gap-1 hover:text-primary">
                  <ImageIcon className="h-4 w-4" /> {postFile ? postFile.name.slice(0, 20) : "إضافة صورة"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPostFile(e.target.files?.[0] || null)} />
                </label>
                <Button onClick={submitPost} disabled={posting} className="gap-2">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  نشر
                </Button>
              </div>
            </Card>
          )}

          {!posts.length ? (
            <Card className="p-12 text-center text-muted-foreground">لا توجد منشورات بعد</Card>
          ) : posts.map((p: any) => (
            <Card key={p.id} className="p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={page.avatar_url} />
                  <AvatarFallback>{(page.name || "P").slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm">{page.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ar })}</p>
                </div>
              </div>
              {p.content && <p className="whitespace-pre-wrap mb-2">{p.content}</p>}
              {p.image_url && <img src={p.image_url} alt="" className="rounded-lg w-full" />}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="about">
          <Card className="p-6 space-y-3 shadow-card">
            <div><p className="text-xs text-muted-foreground">الاسم</p><p className="font-medium">{page.name}</p></div>
            {page.category && <div><p className="text-xs text-muted-foreground">الفئة</p><p className="font-medium">{page.category}</p></div>}
            {page.description && <div><p className="text-xs text-muted-foreground">الوصف</p><p>{page.description}</p></div>}
            <div><p className="text-xs text-muted-foreground">تاريخ الإنشاء</p><p>{new Date(page.created_at).toLocaleDateString("ar")}</p></div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditPageDialog({ page, onSaved }: { page: any; onSaved: () => void }) {
  const [name, setName] = useState(page.name || "");
  const [description, setDescription] = useState(page.description || "");
  const [category, setCategory] = useState(page.category || "");
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
    setSaving(true);
    try {
      const updates: any = { name, description, category };
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
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>تعديل الصفحة</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="الفئة" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف" rows={3} />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted">
            <Camera className="h-4 w-4" />
            <span className="text-xs">{avatarFile ? "✓ صورة" : "تغيير الصورة"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </label>
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted">
            <Camera className="h-4 w-4" />
            <span className="text-xs">{coverFile ? "✓ غلاف" : "تغيير الغلاف"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
