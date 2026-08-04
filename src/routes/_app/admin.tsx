import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Megaphone, Flag, UsersRound, ShieldCheck, Ban, CheckCircle2, Search, Eye, Bell, MessageCircle, Save, Trash2, Loader2 } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { adminDeleteUser, adminGetUser, adminListUsers, adminMessageUser, adminNotifyUser, adminSetUserBan, adminUpdateUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, posts: 0, pages: 0, groups: 0, ads: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [edit, setEdit] = useState({ fullName: "", username: "", bio: "", verified: false });
  const [notice, setNotice] = useState({ title: "", content: "", imageUrl: "", actionUrl: "" });
  const [officialMessage, setOfficialMessage] = useState("");
  const listUsers = useServerFn(adminListUsers);
  const getUser = useServerFn(adminGetUser);
  const updateUser = useServerFn(adminUpdateUser);
  const setUserBan = useServerFn(adminSetUserBan);
  const removeUser = useServerFn(adminDeleteUser);
  const notifyUser = useServerFn(adminNotifyUser);
  const messageUser = useServerFn(adminMessageUser);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("غير مصرح بالدخول");
      navigate({ to: "/home" });
    }
  }, [isAdmin, loading]);

  const refresh = async () => {
    setPageLoading(true);
    const [adminUsers, p, pg, gr, ad] = await Promise.all([
      listUsers(),
      supabase.from("posts").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(50),
      supabase.from("pages").select("id", { count: "exact", head: true }),
      supabase.from("groups").select("id", { count: "exact", head: true }),
      supabase.from("ads").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(50),
    ]);
    setUsers(adminUsers || []);
    setPosts(p.data || []);
    setAds(ad.data || []);
    setStats({
      users: adminUsers?.length || 0, posts: p.count || 0,
      pages: pg.count || 0, groups: gr.count || 0, ads: ad.count || 0,
    });
    setPageLoading(false);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const toggleVerify = async (id: string, current: boolean) => {
    try { await updateUser({ data: { userId: id, verified: !current } }); toast.success(current ? "تم إلغاء التوثيق" : "تم توثيق الحساب"); await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث التوثيق"); }
  };
  const setVerifyStyle = async (id: string, style: "brand" | "gold") => {
    const { error } = await supabase.from("profiles").update({ verified_style: style, verified: true }).eq("id", id);
    if (error) return toast.error("فشل: " + error.message);
    toast.success(style === "gold" ? "تم تعيين التوثيق الذهبي" : "تم تعيين التوثيق الرسمي");
    refresh();
  };

  const toggleBan = async (id: string, current: boolean) => {
    try { await setUserBan({ data: { userId: id, banned: !current } }); toast.success(current ? "تم رفع الحظر" : "تم تعليق الحساب ومنع تسجيل الدخول"); await refresh(); if (selectedId === id) await openUser(id); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة الحساب"); }
  };
  const openUser = async (id: string) => {
    setSelectedId(id); setDetailsLoading(true); setDetails(null);
    try {
      const data = await getUser({ data: { userId: id } });
      setDetails(data);
      setEdit({ fullName: data.profile?.full_name || "", username: data.profile?.username || "", bio: data.profile?.bio || "", verified: !!data.profile?.verified });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل بيانات المستخدم"); }
    finally { setDetailsLoading(false); }
  };
  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setActionLoading(true);
    try { await action(); toast.success(success); await refresh(); if (selectedId) await openUser(selectedId); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تنفيذ العملية"); }
    finally { setActionLoading(false); }
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="wallets">المحافظ</TabsTrigger>
          <TabsTrigger value="topups">التعبئة</TabsTrigger>
          <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
          <TabsTrigger value="campaigns">الحملات</TabsTrigger>
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
                  {pageLoading && Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={4} className="py-3"><Skeleton className="h-12 w-full" /></td></tr>)}
                  {!pageLoading && filteredUsers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-muted/40 transition cursor-pointer" onClick={() => openUser(u.id)}>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{(u.full_name || "K").slice(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div><span className="font-semibold block">{u.full_name || "—"}</span><span className="text-xs text-muted-foreground">{u.email || "—"}</span></div>
                          {u.verified && <VerifiedBadge style={(u.verified_style as any) || "brand"} size={14} />}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">@{u.username}</td>
                      <td className="py-3 px-2">
                        {u.is_banned ? <Badge variant="destructive">محظور</Badge> : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">نشط</Badge>}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-2">
                           <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); toggleVerify(u.id, !!u.verified); }}>
                            <CheckCircle2 className="h-3 w-3 ms-1" />{u.verified ? "إلغاء" : "توثيق"}
                          </Button>
                           <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setVerifyStyle(u.id, "brand"); }} className="gap-1">
                            <VerifiedBadge style="brand" size={12} />رسمي
                          </Button>
                           <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setVerifyStyle(u.id, "gold"); }} className="gap-1">
                            <VerifiedBadge style="gold" size={12} />ذهبي
                          </Button>
                           <Button size="sm" variant={u.is_banned ? "outline" : "destructive"} onClick={(event) => { event.stopPropagation(); toggleBan(u.id, !!u.is_banned); }}>
                            <Ban className="h-3 w-3 ms-1" />{u.is_banned ? "رفع الحظر" : "حظر"}
                          </Button>
                           <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); openUser(u.id); }}><Eye className="h-3 w-3 ms-1" />تفاصيل</Button>
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

        <TabsContent value="wallets" className="mt-4"><AdminWallets users={users} onChange={refresh}/></TabsContent>
        <TabsContent value="topups" className="mt-4"><AdminTopups/></TabsContent>
        <TabsContent value="withdrawals" className="mt-4"><AdminWithdrawals/></TabsContent>
        <TabsContent value="campaigns" className="mt-4"><AdminCampaigns/></TabsContent>
      </Tabs>
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setDetails(null); } }}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>إدارة حساب المستخدم</DialogTitle><DialogDescription>عرض البيانات وتعديل الحساب أو التواصل معه من حساب KAIAN الرسمي.</DialogDescription></DialogHeader>
          {detailsLoading ? <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-28 w-full" /></div> : details?.profile && (
            <div className="space-y-5">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg border p-4">
                <Avatar className="h-16 w-16"><AvatarImage src={details.profile.avatar_url ?? undefined} /><AvatarFallback>{(details.profile.full_name || "K").slice(0, 2)}</AvatarFallback></Avatar>
                <div className="min-w-0"><h2 className="truncate text-xl font-black">{details.profile.full_name || "مستخدم"}</h2><p className="truncate text-sm text-muted-foreground">{details.email || "—"} · @{details.profile.username || "—"}</p><p className="mt-1 text-xs text-muted-foreground">{details.friendsCount} صديق · {details.posts.length} منشور · {details.pages.length} صفحة · {details.groups.length} مجموعة</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2"><Input value={edit.fullName} onChange={(event) => setEdit({ ...edit, fullName: event.target.value })} placeholder="الاسم الكامل" /><Input value={edit.username} onChange={(event) => setEdit({ ...edit, username: event.target.value })} placeholder="اسم المستخدم" /><Textarea className="sm:col-span-2" value={edit.bio} onChange={(event) => setEdit({ ...edit, bio: event.target.value })} placeholder="السيرة الذاتية" /></div>
              <div className="flex flex-wrap gap-2"><Button disabled={actionLoading} onClick={() => runAction(() => updateUser({ data: { userId: details.profile.id, ...edit } }), "تم حفظ بيانات المستخدم")}><Save className="h-4 w-4 ms-1" />حفظ التعديلات</Button><Button variant={details.profile.is_banned ? "outline" : "destructive"} disabled={actionLoading} onClick={() => toggleBan(details.profile.id, !!details.profile.is_banned)}><Ban className="h-4 w-4 ms-1" />{details.profile.is_banned ? "رفع تعليق الحساب" : "تعليق وحظر الحساب"}</Button><Button variant="destructive" disabled={actionLoading} onClick={() => { if (window.confirm("هل تريد حذف هذا المستخدم نهائيًا؟ لا يمكن التراجع.")) runAction(() => removeUser({ data: { userId: details.profile.id } }), "تم حذف المستخدم").then(() => setSelectedId(null)); }}><Trash2 className="h-4 w-4 ms-1" />حذف نهائي</Button></div>
              <div className="border-t pt-4"><h3 className="mb-3 flex items-center gap-2 font-bold"><Bell className="h-4 w-4" />إرسال إشعار</h3><div className="grid gap-2 sm:grid-cols-2"><Input placeholder="عنوان الإشعار" value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} /><Input placeholder="رابط داخلي اختياري مثل /home" value={notice.actionUrl} onChange={(event) => setNotice({ ...notice, actionUrl: event.target.value })} /><Input className="sm:col-span-2" placeholder="رابط صورة اختياري" value={notice.imageUrl} onChange={(event) => setNotice({ ...notice, imageUrl: event.target.value })} /><Textarea className="sm:col-span-2" placeholder="نص الإشعار" value={notice.content} onChange={(event) => setNotice({ ...notice, content: event.target.value })} /><Button disabled={actionLoading || !notice.title.trim() || !notice.content.trim()} onClick={() => runAction(() => notifyUser({ data: { userId: details.profile.id, ...notice } }), "تم إرسال الإشعار").then(() => setNotice({ title: "", content: "", imageUrl: "", actionUrl: "" }))}>إرسال الإشعار</Button></div></div>
              <div className="border-t pt-4"><h3 className="mb-3 flex items-center gap-2 font-bold"><MessageCircle className="h-4 w-4" />مراسلة باسم الحساب الرسمي</h3><Textarea placeholder="اكتب الرسالة الرسمية..." value={officialMessage} onChange={(event) => setOfficialMessage(event.target.value)} /><Button className="mt-2" disabled={actionLoading || !officialMessage.trim()} onClick={() => runAction(() => messageUser({ data: { userId: details.profile.id, content: officialMessage } }), "تم إرسال الرسالة").then(() => setOfficialMessage(""))}>{actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}إرسال الرسالة</Button></div>
              <div className="border-t pt-4"><h3 className="mb-2 font-bold">آخر المنشورات</h3><div className="space-y-2">{details.posts.slice(0, 5).map((post: any) => <div key={post.id} className="rounded-lg bg-muted p-3 text-sm">{post.content || "منشور وسائط"}</div>)}{details.posts.length === 0 && <p className="text-sm text-muted-foreground">لا توجد منشورات.</p>}</div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminWallets({ users, onChange }: { users: any[]; onChange: () => void }) {
  const [wallets, setWallets] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("wallets").select("user_id,balance").then(({ data }) => {
      const m: any = {}; (data || []).forEach(w => m[w.user_id] = Number(w.balance));
      setWallets(m);
    });
  }, [users]);
  const adjust = async (uid: string, sign: 1 | -1) => {
    const v = Number(amount[uid] || 0);
    if (!v) return toast.error("أدخل مبلغًا");
    const { error } = await supabase.rpc("admin_adjust_wallet" as any, { _user_id: uid, _amount: sign * v, _note: note[uid] || "تعديل من الإدارة" });
    if (error) return toast.error(error.message);
    toast.success("تم التعديل");
    setAmount({ ...amount, [uid]: "" }); setNote({ ...note, [uid]: "" });
    const { data } = await supabase.from("wallets").select("user_id,balance");
    const m: any = {}; (data || []).forEach(w => m[w.user_id] = Number(w.balance));
    setWallets(m); onChange();
  };
  return (
    <Card className="p-4 shadow-card space-y-2">
      {users.map(u => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl hover:bg-muted/40 border">
          <div className="flex-1 min-w-[180px]">
            <p className="font-semibold">{u.full_name || u.username}</p>
            <p className="text-xs text-muted-foreground">الرصيد: <span className="font-bold text-primary">{(wallets[u.id] ?? 0).toFixed(2)}$</span></p>
          </div>
          <Input className="w-28" type="number" placeholder="مبلغ" value={amount[u.id] || ""} onChange={e => setAmount({ ...amount, [u.id]: e.target.value })}/>
          <Input className="w-40" placeholder="ملاحظة" value={note[u.id] || ""} onChange={e => setNote({ ...note, [u.id]: e.target.value })}/>
          <Button size="sm" onClick={() => adjust(u.id, 1)} className="bg-emerald-600 hover:bg-emerald-700">+ إضافة</Button>
          <Button size="sm" variant="destructive" onClick={() => adjust(u.id, -1)}>- خصم</Button>
        </div>
      ))}
    </Card>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "معلّق", approved: "موافق", rejected: "مرفوض", completed: "مكتمل",
};
function StatusBadge({ s }: { s: string }) {
  const cls = s === "approved" || s === "completed"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : s === "rejected"
    ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return <Badge variant="outline" className={cls}>{STATUS_LABEL[s] || s}</Badge>;
}

function AdminTopups() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("topup_requests").select("*, profiles:user_id(full_name,username)").order("created_at",{ascending:false});
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);
  const act = async (id: string, status: "approved" | "rejected", note?: string) => {
    const { error } = await supabase.from("topup_requests").update({ status, admin_note: note }).eq("id", id);
    if (error) return toast.error(`فشل التحديث: ${error.message}`);
    toast.success(status === "approved" ? "تمت الموافقة وإضافة الرصيد" : "تم رفض الطلب");
    load();
  };
  return (
    <Card className="p-4 shadow-card space-y-2">
      {items.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات تعبئة</p>}
      {items.map(t => (
        <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border">
          <div>
            <p className="font-semibold">{t.profiles?.full_name || t.profiles?.username} — {Number(t.amount).toFixed(2)}$</p>
            <p className="text-xs text-muted-foreground">{t.method} • مرجع: {t.reference || "—"} • {new Date(t.created_at).toLocaleString("ar")}</p>
            {t.admin_note && <p className="text-xs text-rose-600 mt-1">ملاحظة: {t.admin_note}</p>}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge s={t.status} />
            {t.status === "pending" && <>
              <Button size="sm" onClick={() => act(t.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">قبول وإضافة الرصيد</Button>
              <Button size="sm" variant="destructive" onClick={() => act(t.id, "rejected", "تم الرفض")}>رفض</Button>
            </>}
          </div>
        </div>
      ))}
    </Card>
  );
}

function AdminWithdrawals() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("withdrawal_requests").select("*, profiles:user_id(full_name,username)").order("created_at",{ascending:false});
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);
  const act = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("withdrawal_requests").update({ status }).eq("id", id);
    if (error) return toast.error(`فشل التحديث: ${error.message}`);
    toast.success(status === "approved" ? "تم تأكيد التحويل" : "تم الرفض وإعادة الرصيد");
    load();
  };
  return (
    <Card className="p-4 shadow-card space-y-2">
      {items.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات سحب</p>}
      {items.map(t => (
        <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border">
          <div>
            <p className="font-semibold">{t.profiles?.full_name || t.profiles?.username} — {Number(t.amount).toFixed(2)}$</p>
            <p className="text-xs text-muted-foreground">{t.method} • {t.account_info} • {new Date(t.created_at).toLocaleString("ar")}</p>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge s={t.status} />
            {t.status === "pending" && <>
              <Button size="sm" onClick={() => act(t.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">تم التحويل</Button>
              <Button size="sm" variant="destructive" onClick={() => act(t.id, "rejected")}>رفض وإعادة الرصيد</Button>
            </>}
          </div>
        </div>
      ))}
    </Card>
  );
}


function AdminCampaigns() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("ad_campaigns").select("*, profiles:user_id(full_name,username)").order("created_at",{ascending:false});
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => {
    await supabase.from("ad_campaigns").update({ status }).eq("id", id);
    toast.success("تم"); load();
  };
  return (
    <Card className="p-4 shadow-card space-y-2">
      {items.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد حملات</p>}
      {items.map(c => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border">
          <div className="flex items-center gap-3 flex-1">
            {c.image_url && <img src={c.image_url} className="h-14 w-20 object-cover rounded"/>}
            <div>
              <p className="font-semibold">{c.title} <span className="text-xs text-muted-foreground">— {c.profiles?.full_name || c.profiles?.username}</span></p>
              <p className="text-xs text-muted-foreground">ميزانية: {Number(c.budget).toFixed(2)}$ • مشاهدات: {c.impressions} • نقرات: {c.clicks}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={c.status==="active"?"default":c.status==="rejected"?"destructive":"outline"}>{c.status}</Badge>
            <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "active")}>تفعيل</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")}>إيقاف</Button>
            <Button size="sm" variant="destructive" onClick={() => setStatus(c.id, "rejected")}>رفض</Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
