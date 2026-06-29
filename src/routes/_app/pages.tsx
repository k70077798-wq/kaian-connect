import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flag, Plus, Search, Users2, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pages")({ component: PagesPage });

const CATEGORIES = ["أعمال", "ترفيه", "تعليم", "تقنية", "رياضة", "أخبار", "فن", "طعام", "سفر", "موضة", "صحة", "أخرى"];

function PagesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("discover");
  const [pages, setPages] = useState<any[]>([]);
  const [myPages, setMyPages] = useState<any[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: allPages }, mine, follows] = await Promise.all([
      supabase.from("pages").select("*").order("created_at", { ascending: false }).limit(60),
      user ? supabase.from("pages").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      user ? supabase.from("page_followers" as any).select("page_id").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
    ]);
    setPages(allPages || []);
    setMyPages(mine.data || []);
    setFollowedIds(new Set(((follows.data as any[]) || []).map((f: any) => f.page_id)));
    const ids = (allPages || []).map((p: any) => p.id);
    if (ids.length) {
      const { data: fc } = await supabase.from("page_followers" as any).select("page_id").in("page_id", ids);
      const counts: Record<string, number> = {};
      ((fc as any[]) || []).forEach((r: any) => { counts[r.page_id] = (counts[r.page_id] || 0) + 1; });
      setFollowerCounts(counts);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`pages-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "page_followers" }, () => load());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  async function toggleFollow(pageId: string) {
    if (!user) return toast.error("يجب تسجيل الدخول");
    if (followedIds.has(pageId)) {
      await supabase.from("page_followers" as any).delete().eq("page_id", pageId).eq("user_id", user.id);
      toast.success("تم إلغاء المتابعة");
    } else {
      await supabase.from("page_followers" as any).insert({ page_id: pageId, user_id: user.id } as any);
      toast.success("تمت المتابعة");
    }
  }

  const filtered = pages.filter((p: any) =>
    !query || (p.name || "").toLowerCase().includes(query.toLowerCase()) || (p.category || "").includes(query)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">الصفحات</h1>
            <p className="text-xs text-muted-foreground">اكتشف صفحات تهمك وأنشئ صفحتك الخاصة</p>
          </div>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> إنشاء صفحة</Button>
          </DialogTrigger>
          <CreatePageDialog onCreated={() => { setOpenCreate(false); load(); }} />
        </Dialog>
      </div>

      <Card className="p-3 mb-4 shadow-card">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في الصفحات بالاسم أو الفئة..." className="pr-10" />
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="discover">اكتشف</TabsTrigger>
          <TabsTrigger value="following">أتابع</TabsTrigger>
          <TabsTrigger value="mine">صفحاتي</TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <PageGrid pages={filtered} followedIds={followedIds} counts={followerCounts} onToggle={toggleFollow} loading={loading} userId={user?.id} />
        </TabsContent>
        <TabsContent value="following">
          <PageGrid pages={filtered.filter((p: any) => followedIds.has(p.id))} followedIds={followedIds} counts={followerCounts} onToggle={toggleFollow} loading={loading} userId={user?.id} empty="لا تتابع أي صفحة بعد" />
        </TabsContent>
        <TabsContent value="mine">
          <PageGrid pages={myPages} followedIds={followedIds} counts={followerCounts} onToggle={toggleFollow} loading={loading} userId={user?.id} empty="لم تنشئ أي صفحة بعد" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PageGrid({ pages, followedIds, counts, onToggle, loading, userId, empty }: any) {
  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!pages.length) return <Card className="p-12 text-center text-muted-foreground">{empty || "لا توجد صفحات"}</Card>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {pages.map((p: any) => (
        <Card key={p.id} className="overflow-hidden shadow-card hover:shadow-glow transition-all">
          <Link to="/pages/$pageId" params={{ pageId: p.id }} className="block">
            <div className="h-28 bg-brand-gradient relative">
              {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="p-4 -mt-8">
              <Avatar className="h-16 w-16 ring-4 ring-card">
                <AvatarImage src={p.avatar_url} />
                <AvatarFallback className="bg-accent text-primary font-black">{(p.name || "P").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <h3 className="font-bold mt-2 line-clamp-1">{p.name}</h3>
              {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
              {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Users2 className="h-3 w-3" /> {counts[p.id] || 0} متابع
              </div>
            </div>
          </Link>
          <div className="p-4 pt-0">
            {userId === p.owner_id ? (
              <Button variant="outline" className="w-full" asChild>
                <Link to="/pages/$pageId" params={{ pageId: p.id }}>إدارة الصفحة</Link>
              </Button>
            ) : (
              <Button onClick={() => onToggle(p.id)} variant={followedIds.has(p.id) ? "outline" : "default"} className="w-full">
                {followedIds.has(p.id) ? "أتابع ✓" : "متابعة"}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function CreatePageDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFile(file: File, prefix: string) {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/pages/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function submit() {
    if (!user) return toast.error("يجب تسجيل الدخول");
    if (!name.trim()) return toast.error("أدخل اسم الصفحة");
    setSaving(true);
    try {
      let avatar_url: string | null = null;
      let cover_url: string | null = null;
      if (avatarFile) avatar_url = await uploadFile(avatarFile, "avatar");
      if (coverFile) cover_url = await uploadFile(coverFile, "cover");
      const { error } = await supabase.from("pages").insert({
        name: name.trim(),
        description: description.trim() || null,
        category,
        avatar_url,
        cover_url,
        owner_id: user.id,
      } as any);
      if (error) throw error;
      toast.success("تم إنشاء الصفحة بنجاح");
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>إنشاء صفحة جديدة</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input placeholder="اسم الصفحة" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Textarea placeholder="وصف الصفحة" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted">
            <ImageIcon className="h-4 w-4" />
            <span className="text-xs">{avatarFile ? avatarFile.name.slice(0, 16) : "صورة الصفحة"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </label>
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted">
            <ImageIcon className="h-4 w-4" />
            <span className="text-xs">{coverFile ? coverFile.name.slice(0, 16) : "صورة الغلاف"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء الصفحة"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
