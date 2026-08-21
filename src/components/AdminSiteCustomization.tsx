import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Image as ImageIcon, Loader2, Megaphone, Palette, RotateCcw, Save, Settings2, Type, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { adminSaveSiteSettings } from "@/lib/site-settings.functions";
import { DEFAULT_SITE_SETTINGS, type SiteSettings, useSiteSettings } from "@/lib/site-settings";
import { SiteLogo } from "@/components/SiteLogo";

const textFields: { key: keyof SiteSettings["text"]; label: string; multiline?: boolean }[] = [
  { key: "tagline", label: "وصف المنصة" }, { key: "loginTitle", label: "عنوان تسجيل الدخول" },
  { key: "loginSubtitle", label: "وصف تسجيل الدخول" }, { key: "loginButton", label: "زر تسجيل الدخول" },
  { key: "registerTitle", label: "عنوان إنشاء الحساب" }, { key: "registerSubtitle", label: "وصف إنشاء الحساب" },
  { key: "registerButton", label: "زر إنشاء الحساب" }, { key: "composerPlaceholder", label: "نص صندوق النشر" },
  { key: "footer", label: "نص الحقوق والتذييل", multiline: true },
];

const featureFields: { key: keyof SiteSettings["features"]; label: string; detail: string }[] = [
  { key: "live", label: "البث المباشر", detail: "زر بدء البث في صندوق النشر" },
  { key: "stories", label: "القصص", detail: "إنشاء القصص وشريط عرضها" },
  { key: "reels", label: "الريلز", detail: "اختصار الريلز والشريط في الرئيسية" },
  { key: "wallet", label: "المحفظة", detail: "اختصارات المحفظة في القوائم" },
  { key: "ads", label: "الإعلانات", detail: "عرض الإعلانات الممولة في الخلاصة" },
];

export function AdminSiteCustomization() {
  const { settings, refresh } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveSettings = useServerFn(adminSaveSiteSettings);

  useEffect(() => setDraft(settings), [settings]);
  const update = <K extends keyof SiteSettings>(section: K, patch: Partial<SiteSettings[K]>) => setDraft((current) => ({ ...current, [section]: { ...current[section], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({ data: { value: draft as unknown as Record<string, unknown> } });
      await refresh();
      toast.success("تم حفظ إعدادات المنصة وتطبيقها");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ الإعدادات"); }
    finally { setSaving(false); }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return toast.error("اختر صورة بحجم لا يتجاوز 5MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `admin/site/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (error) toast.error(`تعذر رفع الشعار: ${error.message}`);
    else update("identity", { logoUrl: supabase.storage.from("media").getPublicUrl(path).data.publicUrl });
    setUploading(false);
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/95 p-3 shadow-card backdrop-blur">
        <div><h2 className="font-black">مركز هوية وتخصيص المنصة</h2><p className="text-xs text-muted-foreground">المعاينة والتغييرات تظهر في المنصة بعد الحفظ مباشرة.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setDraft(DEFAULT_SITE_SETTINGS)}><RotateCcw className="ms-1 h-4 w-4" />الافتراضي</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ms-1 h-4 w-4 animate-spin" /> : <Save className="ms-1 h-4 w-4" />}حفظ وتطبيق</Button></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-black"><ImageIcon className="h-5 w-5 text-primary" />الشعار والهوية</h3>
          <div className="flex items-center gap-4 rounded-lg bg-muted p-4"><SiteLogo /><div><p className="font-bold">{draft.identity.siteName}</p><p className="text-xs text-muted-foreground">معاينة الشعار الحالي</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="اسم المنصة"><Input value={draft.identity.siteName} maxLength={40} onChange={(e) => update("identity", { siteName: e.target.value })} /></Field><Field label="رابط الشعار"><Input dir="ltr" value={draft.identity.logoUrl} onChange={(e) => update("identity", { logoUrl: e.target.value })} /></Field></div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm font-bold hover:bg-muted"><Upload className="h-4 w-4" />{uploading ? "جارٍ الرفع..." : "رفع شعار جديد"}<input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => uploadLogo(e.target.files?.[0])} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><SliderField label={`حجم الشعار: ${draft.identity.logoSize}px`} value={draft.identity.logoSize} min={28} max={120} onChange={(value) => update("identity", { logoSize: value })} /><SliderField label={`استدارة الحواف: ${draft.identity.logoRadius}px`} value={draft.identity.logoRadius} min={0} max={60} onChange={(value) => update("identity", { logoRadius: value })} /></div>
          <Toggle label="إطار حول الشعار" checked={draft.identity.logoBorder} onChange={(value) => update("identity", { logoBorder: value })} /><Toggle label="خلفية للشعار" checked={draft.identity.logoBackground} onChange={(value) => update("identity", { logoBackground: value })} />
        </Card>

        <Card className="space-y-4 p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-black"><Palette className="h-5 w-5 text-primary" />الألوان والتأثيرات</h3>
          <div className="h-24 rounded-lg border" style={{ background: `linear-gradient(${draft.appearance.gradientAngle}deg, ${draft.appearance.primary}, ${draft.appearance.button} 48%, ${draft.appearance.secondary})` }} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><ColorField label="الأساسي" value={draft.appearance.primary} onChange={(value) => update("appearance", { primary: value })} /><ColorField label="الثانوي" value={draft.appearance.secondary} onChange={(value) => update("appearance", { secondary: value })} /><ColorField label="الأزرار" value={draft.appearance.button} onChange={(value) => update("appearance", { button: value })} /><ColorField label="الخلفية" value={draft.appearance.surface} onChange={(value) => update("appearance", { surface: value })} /></div>
          <SliderField label={`زاوية التدرج: ${draft.appearance.gradientAngle}°`} value={draft.appearance.gradientAngle} min={0} max={360} onChange={(value) => update("appearance", { gradientAngle: value })} />
          <SliderField label={`شدة الظلال: ${draft.appearance.shadowStrength}%`} value={draft.appearance.shadowStrength} min={0} max={70} onChange={(value) => update("appearance", { shadowStrength: value })} />
        </Card>

        <Card className="space-y-4 p-5 shadow-card xl:col-span-2">
          <h3 className="flex items-center gap-2 font-black"><Type className="h-5 w-5 text-primary" />النصوص الرئيسية</h3>
          <div className="grid gap-3 md:grid-cols-2">{textFields.map((field) => <Field key={field.key} label={field.label}>{field.multiline ? <Textarea value={draft.text[field.key]} onChange={(e) => update("text", { [field.key]: e.target.value })} /> : <Input value={draft.text[field.key]} onChange={(e) => update("text", { [field.key]: e.target.value })} />}</Field>)}</div>
        </Card>

        <Card className="space-y-3 p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-black"><Settings2 className="h-5 w-5 text-primary" />الميزات والأزرار</h3>
          {featureFields.map((feature) => <div key={feature.key} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-bold">{feature.label}</p><p className="text-xs text-muted-foreground">{feature.detail}</p></div><Switch checked={draft.features[feature.key]} onCheckedChange={(value) => update("features", { [feature.key]: value })} /></div>)}
        </Card>

        <Card className="space-y-4 p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-black"><Megaphone className="h-5 w-5 text-primary" />شريط التنبيه الداخلي</h3>
          <Toggle label="تفعيل التنبيه" checked={draft.notice.enabled} onChange={(value) => update("notice", { enabled: value, version: String(Date.now()) })} />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="العنوان"><Input value={draft.notice.title} maxLength={100} onChange={(e) => update("notice", { title: e.target.value })} /></Field><Field label="النمط"><Select value={draft.notice.style} onValueChange={(value: SiteSettings["notice"]["style"]) => update("notice", { style: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">معلومات</SelectItem><SelectItem value="success">نجاح</SelectItem><SelectItem value="warning">تنبيه</SelectItem><SelectItem value="danger">هام</SelectItem></SelectContent></Select></Field></div>
          <Field label="نص التنبيه"><Textarea value={draft.notice.message} maxLength={500} onChange={(e) => update("notice", { message: e.target.value })} /></Field>
          <Field label="رابط صورة اختياري"><Input dir="ltr" value={draft.notice.imageUrl} onChange={(e) => update("notice", { imageUrl: e.target.value })} /></Field>
          <Field label="الصفحات المستهدفة (* للجميع أو /home,/wallet)"><Input dir="ltr" value={draft.notice.routes} onChange={(e) => update("notice", { routes: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="يبدأ في"><Input type="datetime-local" value={draft.notice.startsAt} onChange={(e) => update("notice", { startsAt: e.target.value })} /></Field><Field label="ينتهي في"><Input type="datetime-local" value={draft.notice.endsAt} onChange={(e) => update("notice", { endsAt: e.target.value })} /></Field></div>
          <Toggle label="يمكن للمستخدم إغلاقه" checked={draft.notice.dismissible} onChange={(value) => update("notice", { dismissible: value })} />
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><div className="flex items-center gap-2"><Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 p-1" /><Input value={value} dir="ltr" maxLength={7} onChange={(e) => onChange(e.target.value)} /></div></Field>; }
function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <Field label={label}><Slider min={min} max={max} step={1} value={[value]} onValueChange={(values) => onChange(values[0] ?? value)} /></Field>; }