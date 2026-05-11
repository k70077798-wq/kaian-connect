import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, FileText, Megaphone, Flag, UsersRound, ShieldCheck, Ban, CheckCircle2, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, posts: 0, pages: 0, groups: 0, ads: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("غير مصرح بالدخول");
      navigate({ to: "/home" });
    }
  }, [isAdmin, loading]);

  const refresh = async () => {
    const [u, p, pg, gr, ad] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(100),
      supabase.from("posts").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(50),
      supabase.from("pages").select("id", { count: "exact", head: true }),
      supabase.from("groups").select("id", { count: "exact", head: true }),
      supabase.from("ads").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(50),
    ]);
    setUsers(u.data || []);
    setPosts(p.data || []);
    setAds(ad.data || []);
    setStats({
      users: u.count || 0, posts: p.count || 0,
      pages: pg.count || 0, groups: gr.count || 0, ads: ad.count || 0,
    });
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const toggleVerify = async (id: string, current: boolean) => {
    await supabase.from("profiles").update({ verified: !current }).eq("id", id);
    toast.success(current ? "تم إلغاء التوثيق" : "تم توثيق الحساب");
    refresh();
  };
  const toggleBan = async (id: string, current: boolean) => {
    await supabase.from("profiles").update({ is_banned: !current }).eq("id", id);
    toast.success(current ? "تم رفع الحظر" : "تم حظر المستخدم");
    refresh();
  };
  const deletePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast.success("تم حذف المنشور");
    refresh();
  };
  const updateAdStatus = async (id: string, status: string) => {
    await supabase.from("ads").update({ status }).eq("id", id);
    toast.success("تم تحديث حالة الإعلان");
    refresh();
  };

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u =>
    !search || (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const cards = [
    { label: "المستخدمون", value: stats.users, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "المنشورات", value: stats.posts, icon: FileText, color: "from-emerald-500 to-emerald-600" },
    { label: "الصفحات", value: stats.pages, icon: Flag, color: "from-amber-500 to-amber-600" },
    { label: "المجموعات", value: stats.groups, icon: UsersRound, color: "from-violet-500 to-violet-600" },
    { label: "الإعلانات", value: stats.ads, icon: Megaphone, color: "from-rose-500 to-rose-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" />لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة منصة KAIAN — المستخدمين، المحتوى، الإعلانات وأكثر.</p>
        </div>
        <Badge className="bg-brand-gradient text-primary-foreground border-0">مشرف</Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {cards.map(c => (
          <Card key={c.label} className="p-5 shadow-card overflow-hidden relative">
            <div className={`absolute -top-4 -left-4 h-20 w-20 rounded-full bg-gradient-to-br ${c.color} opacity-10`} />
            <c.icon className="h-6 w-6 text-primary mb-2" />
            <p className="text-3xl font-black">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="ads">الإعلانات</TabsTrigger>
          <TabsTrigger value="analytics">الإحصائيات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="p-4 shadow-card">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مستخدم..." className="pr-10 rounded-xl" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-right">
                  <tr className="border-b">
                    <th className="py-3 px-2">المستخدم</th>
                    <th className="py-3 px-2">اسم المستخدم</th>
                    <th className="py-3 px-2">الحالة</th>
                    <th className="py-3 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-muted/40 transition">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{(u.full_name || "K").slice(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{u.full_name || "—"}</span>
                          {u.verified && <span className="text-primary">✓</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">@{u.username}</td>
                      <td className="py-3 px-2">
                        {u.is_banned ? <Badge variant="destructive">محظور</Badge> : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">نشط</Badge>}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleVerify(u.id, !!u.verified)}>
                            <CheckCircle2 className="h-3 w-3 ms-1" />{u.verified ? "إلغاء التوثيق" : "توثيق"}
                          </Button>
                          <Button size="sm" variant={u.is_banned ? "outline" : "destructive"} onClick={() => toggleBan(u.id, !!u.is_banned)}>
                            <Ban className="h-3 w-3 ms-1" />{u.is_banned ? "رفع الحظر" : "حظر"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <Card className="p-4 shadow-card space-y-2">
            {posts.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-muted/40">
                <div className="flex-1">
                  <p className="text-sm">{p.content || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString("ar")}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deletePost(p.id)}>حذف</Button>
              </div>
            ))}
            {posts.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد منشورات</p>}
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="mt-4">
          <Card className="p-4 shadow-card space-y-2">
            {ads.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-muted/40">
                <div className="flex-1">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">الميزانية: {a.budget} — الحالة: {a.status}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateAdStatus(a.id, "approved")}>قبول</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateAdStatus(a.id, "rejected")}>رفض</Button>
                </div>
              </div>
            ))}
            {ads.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد إعلانات</p>}
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="p-8 shadow-card text-center">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold">تحليلات متقدمة</h3>
            <p className="text-muted-foreground mt-2">قريباً — رسوم بيانية تفصيلية لنمو المنصة.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
