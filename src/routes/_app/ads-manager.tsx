import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Megaphone, Plus, Eye, MousePointerClick, DollarSign, Image as ImageIcon, Pause, Play, Trash2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ads-manager")({ component: AdsManagerPage });

const AUDIENCES = [
  { id: "all", label: "جميع المستخدمين" },
  { id: "youth", label: "الشباب 18-30" },
  { id: "adult", label: "البالغين 30-50" },
  { id: "yemen", label: "اليمن" },
  { id: "gulf", label: "الخليج" },
  { id: "arab", label: "العالم العربي" },
];

function AdsManagerPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", content: "", image_url: "", link_url: "", cta: "اعرف المزيد",
    budget: 1, daily_cost: 1, audience: "all", duration_days: 7,
  });
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const [{ data: c }, { data: w }] = await Promise.all([
      supabase.from("ad_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setCampaigns(c || []);
    setBalance(Number(w?.balance ?? 0));
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/ads/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) { toast.error("فشل الرفع"); setUploading(false); return; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
  };

  const createCampaign = async () => {
    if (!form.title.trim()) return toast.error("أضف عنوان للحملة");
    if (form.budget < 1) return toast.error("الحد الأدنى للميزانية 1$");
    if (form.budget > balance) return toast.error("رصيد المحفظة غير كافٍ");
    const ends = new Date(); ends.setDate(ends.getDate() + form.duration_days);
    const { error } = await supabase.from("ad_campaigns").insert({
      user_id: user!.id, title: form.title, content: form.content, image_url: form.image_url || null,
      link_url: form.link_url || null, cta: form.cta, budget: form.budget, daily_cost: form.daily_cost,
      audience: form.audience, ends_at: ends.toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("🚀 تم إنشاء الحملة وبدأت بالظهور");
    setOpen(false);
    setForm({ title: "", content: "", image_url: "", link_url: "", cta: "اعرف المزيد", budget: 1, daily_cost: 1, audience: "all", duration_days: 7 });
    refresh();
  };

  const toggleStatus = async (c: any) => {
    const next = c.status === "active" ? "paused" : "active";
    await supabase.from("ad_campaigns").update({ status: next }).eq("id", c.id);
    refresh();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("حذف الحملة؟ (لن يتم استرداد الميزانية)")) return;
    await supabase.from("ad_campaigns").delete().eq("id", id);
    refresh();
  };

  const statusBadge = (s: string) => {
    if (s === "active") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">نشطة</Badge>;
    if (s === "paused") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">متوقفة</Badge>;
    if (s === "completed") return <Badge variant="secondary">منتهية</Badge>;
    if (s === "rejected") return <Badge variant="destructive">مرفوضة</Badge>;
    return <Badge variant="outline">قيد المراجعة</Badge>;
  };

  const totals = campaigns.reduce((a, c) => ({
    spent: a.spent + Number(c.spent || 0),
    impressions: a.impressions + (c.impressions || 0),
    clicks: a.clicks + (c.clicks || 0),
  }), { spent: 0, impressions: 0, clicks: 0 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><Megaphone className="h-7 w-7 text-primary"/>مدير الإعلانات</h1>
          <p className="text-sm text-muted-foreground mt-1">أنشئ حملات احترافية واستهدف جمهورك المثالي على KAIAN.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/wallet" className="text-sm bg-muted px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-muted/80"><Wallet className="h-4 w-4"/>{balance.toFixed(2)}$</Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-gradient text-primary-foreground border-0 gap-2"><Plus className="h-4 w-4"/>حملة جديدة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>إنشاء حملة إعلانية</DialogTitle></DialogHeader>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><Label>عنوان الحملة *</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="مثلاً: تخفيضات الصيف"/></div>
                  <div><Label>نص الإعلان</Label><Textarea rows={4} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="اكتب رسالة جذابة..."/></div>
                  <div><Label>رابط الإعلان (URL)</Label><Input value={form.link_url} onChange={e=>setForm({...form,link_url:e.target.value})} placeholder="https://..."/></div>
                  <div><Label>نص الزر</Label>
                    <Select value={form.cta} onValueChange={v=>setForm({...form,cta:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {["اعرف المزيد","تسوّق الآن","سجّل الآن","حمّل التطبيق","احجز الآن","تواصل معنا"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>صورة الإعلان</Label>
                    <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    {uploading && <p className="text-xs text-muted-foreground mt-1">جاري الرفع...</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  <div><Label>الجمهور المستهدف</Label>
                    <Select value={form.audience} onValueChange={v=>setForm({...form,audience:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{AUDIENCES.map(a=><SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>الميزانية الإجمالية ($)</Label>
                    <Input type="number" min={1} value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})}/>
                    <p className="text-xs text-muted-foreground mt-1">سيتم خصمها من محفظتك مباشرة. متاح: {balance.toFixed(2)}$</p>
                  </div>
                  <div><Label>المدة (أيام)</Label>
                    <Input type="number" min={1} max={90} value={form.duration_days} onChange={e=>setForm({...form,duration_days:Number(e.target.value)})}/>
                  </div>
                  <div><Label>التكلفة اليومية ($)</Label>
                    <Input type="number" min={0.1} step={0.1} value={form.daily_cost} onChange={e=>setForm({...form,daily_cost:Number(e.target.value)})}/>
                  </div>
                  {/* Preview */}
                  <Card className="p-3 bg-muted/40">
                    <p className="text-[10px] text-muted-foreground mb-2">معاينة:</p>
                    {form.image_url && <img src={form.image_url} className="rounded-lg w-full aspect-video object-cover mb-2"/>}
                    <p className="font-bold text-sm">{form.title || "عنوان الحملة"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{form.content || "نص الإعلان"}</p>
                    <Button size="sm" className="mt-2 w-full bg-brand-gradient text-primary-foreground border-0">{form.cta}</Button>
                  </Card>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createCampaign} className="bg-brand-gradient text-primary-foreground border-0">إنشاء وخصم {form.budget}$</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4"><Megaphone className="h-5 w-5 text-primary mb-2"/><p className="text-2xl font-black">{campaigns.length}</p><p className="text-xs text-muted-foreground">إجمالي الحملات</p></Card>
        <Card className="p-4"><Eye className="h-5 w-5 text-primary mb-2"/><p className="text-2xl font-black">{totals.impressions.toLocaleString()}</p><p className="text-xs text-muted-foreground">المشاهدات</p></Card>
        <Card className="p-4"><MousePointerClick className="h-5 w-5 text-primary mb-2"/><p className="text-2xl font-black">{totals.clicks.toLocaleString()}</p><p className="text-xs text-muted-foreground">النقرات</p></Card>
        <Card className="p-4"><DollarSign className="h-5 w-5 text-primary mb-2"/><p className="text-2xl font-black">{totals.spent.toFixed(2)}$</p><p className="text-xs text-muted-foreground">إجمالي الصرف</p></Card>
      </div>

      <div className="grid gap-3">
        {campaigns.length === 0 && (
          <Card className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
            <h3 className="text-lg font-bold">لم تنشئ حملات بعد</h3>
            <p className="text-sm text-muted-foreground">ابدأ بحملة بدولار واحد فقط!</p>
          </Card>
        )}
        {campaigns.map(c => {
          const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
          return (
            <Card key={c.id} className="p-4 flex flex-col sm:flex-row gap-4">
              {c.image_url ? <img src={c.image_url} className="w-full sm:w-40 aspect-video object-cover rounded-lg"/> : <div className="w-full sm:w-40 aspect-video bg-muted rounded-lg grid place-items-center"><ImageIcon className="h-8 w-8 text-muted-foreground"/></div>}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{c.title}</h3>
                  {statusBadge(c.status)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{c.content}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3"/>{c.impressions} مشاهدة</span>
                  <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3"/>{c.clicks} نقرة</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3"/>CTR {ctr}%</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3"/>{Number(c.spent).toFixed(2)}/{Number(c.budget).toFixed(2)}$</span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                  {c.status === "active" ? <><Pause className="h-3 w-3 ms-1"/>إيقاف</> : <><Play className="h-3 w-3 ms-1"/>تشغيل</>}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-3 w-3"/></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
