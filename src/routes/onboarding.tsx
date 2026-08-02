import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddFriendButton } from "@/components/AddFriendButton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, ImagePlus, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "إعداد حسابك — KAIAN" },
      { name: "description", content: "أكمل إعداد حسابك على KAIAN: الصورة الشخصية، الأصدقاء، ومعلوماتك الشخصية." },
      { property: "og:title", content: "إعداد حسابك — KAIAN" },
      { property: "og:description", content: "أكمل إعداد حسابك على KAIAN في خطوات سريعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const INTERESTS = [
  "رياضة", "تقنية", "سفر", "طبخ", "موسيقى", "أفلام", "قراءة", "تصوير",
  "ألعاب", "سيارات", "صحة ولياقة", "أعمال", "فن", "أخبار", "تعليم", "برمجة",
];

const STEPS = ["الصور", "الأصدقاء", "معلوماتك"];

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user]);

  const finish = async () => {
    if (user) await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    navigate({ to: "/home" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background" dir="rtl">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-gradient py-8 px-4" dir="rtl">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-2 rounded-full transition-colors ${i <= step ? "bg-brand-gradient" : "bg-muted"}`} />
              <p className={`mt-2 text-xs font-semibold ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-5 sm:p-7 shadow-card">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {step === 0 && <PhotosStep userId={user.id} onNext={() => setStep(1)} onSkip={() => setStep(1)} />}
              {step === 1 && <FriendsStep userId={user.id} onNext={() => setStep(2)} onSkip={() => setStep(2)} />}
              {step === 2 && <InfoStep userId={user.id} onDone={finish} onSkip={finish} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 text-center">
          <button onClick={finish} className="text-sm text-muted-foreground hover:text-primary hover:underline">
            تخطي الإعداد والانتقال إلى الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Nav({ onNext, onSkip, nextLabel = "التالي", busy }: { onNext: () => void; onSkip: () => void; nextLabel?: string; busy?: boolean }) {
  return (
    <div className="mt-7 flex items-center gap-3">
      <Button onClick={onNext} disabled={busy} className="flex-1 h-12 rounded-xl bg-brand-gradient font-bold shadow-elegant hover:opacity-95">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : nextLabel}
      </Button>
      <Button onClick={onSkip} variant="ghost" className="h-12 rounded-xl">تخطي</Button>
    </div>
  );
}

function PhotosStep({ userId, onNext, onSkip }: { userId: string; onNext: () => void; onSkip: () => void }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<"avatar" | "cover" | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("avatar_url, cover_url").eq("id", userId).maybeSingle().then(({ data }) => {
      if (data) { setAvatar(data.avatar_url); setCover(data.cover_url); }
    });
  }, [userId]);

  const upload = async (file: File, kind: "avatar" | "cover") => {
    if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار صورة صالحة"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("حجم الصورة يجب ألا يتجاوز 10MB"); return; }
    setBusyKind(kind);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setBusyKind(null); toast.error(`تعذر رفع الصورة: ${error.message}`); return; }
    const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    const col = kind === "avatar" ? { avatar_url: url } : { cover_url: url };
    const { error: uErr } = await supabase.from("profiles").update(col).eq("id", userId);
    setBusyKind(null);
    if (uErr) return toast.error(`تعذر حفظ الصورة: ${uErr.message}`);
    if (kind === "avatar") setAvatar(url); else setCover(url);
    toast.success("تم حفظ الصورة");
  };

  return (
    <div>
      <StepHeader title="أضف صورتك الشخصية والغلاف" desc="اجعل حسابك مميزاً — يمكنك تغييرها في أي وقت." />

      <div className="relative">
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          className="relative block h-40 w-full overflow-hidden rounded-xl bg-brand-gradient"
        >
          {cover && <img src={cover} alt="صورة الغلاف" className="absolute inset-0 h-full w-full object-cover" />}
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-lg bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            {busyKind === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            صورة الغلاف
          </span>
        </button>

        <div className="absolute -bottom-10 right-6">
          <button type="button" onClick={() => avatarRef.current?.click()} className="relative block">
            <Avatar className="h-24 w-24 border-4 border-card shadow-elegant">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback className="bg-muted text-xl font-bold">K</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 left-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-card">
              {busyKind === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </span>
          </button>
        </div>
      </div>
      <div className="h-12" />

      <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "avatar"); e.target.value = ""; }} />
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "cover"); e.target.value = ""; }} />

      <Nav onNext={onNext} onSkip={onSkip} busy={busyKind !== null} />
    </div>
  );
}

function FriendsStep({ userId, onNext, onSkip }: { userId: string; onNext: () => void; onSkip: () => void }) {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .neq("id", userId)
        .order("created_at", { ascending: false })
        .limit(12);
      setPeople(data ?? []);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div>
      <StepHeader title="أضف أصدقاء" desc="ابدأ ببناء شبكتك — أرسل طلبات صداقة لمن تعرفهم." />
      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : people.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">لا يوجد مستخدمون آخرون بعد.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-muted">{(p.full_name || "K").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{p.full_name || "مستخدم"}</p>
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              </div>
              <AddFriendButton userId={p.id} compact />
            </div>
          ))}
        </div>
      )}
      <Nav onNext={onNext} onSkip={onSkip} />
    </div>
  );
}

function InfoStep({ userId, onDone, onSkip }: { userId: string; onDone: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({
    work: "", birthdate: "", hometown: "", bio: "",
    facebook: "", instagram: "", x: "", website: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const social = useMemo(() => {
    const s: Record<string, string> = {};
    (["facebook", "instagram", "x", "website"] as const).forEach((k) => {
      const v = form[k].trim();
      if (v) s[k] = v;
    });
    return s;
  }, [form]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      work: form.work.trim() || null,
      birthdate: form.birthdate || null,
      hometown: form.hometown.trim() || null,
      bio: form.bio.trim() || null,
      social_links: social,
      interests,
    }).eq("id", userId);
    setBusy(false);
    if (error) return toast.error("تعذر حفظ المعلومات: " + error.message);
    toast.success("تم حفظ معلوماتك");
    onDone();
  };

  return (
    <div>
      <StepHeader title="أكمل معلوماتك" desc="ساعد أصدقاءك على التعرف عليك أكثر." />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>مكان العمل</Label>
            <Input value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value })} placeholder="مثال: شركة كيان" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>تاريخ الميلاد</Label>
            <Input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>مكان المنشأ</Label>
            <Input value={form.hometown} onChange={(e) => setForm({ ...form, hometown: e.target.value })} placeholder="المدينة / البلد" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>الموقع الإلكتروني</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>السيرة الذاتية</Label>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="اكتب نبذة عنك..." rows={3} className="rounded-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>فيسبوك</Label>
            <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>إنستغرام</Label>
            <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>X (تويتر)</Label>
            <Input value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>اهتماماتك</Label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = interests.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-brand-gradient text-primary-foreground border-transparent" : "bg-background hover:bg-accent"}`}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {i}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Nav onNext={save} onSkip={onSkip} nextLabel="إنهاء والانتقال للرئيسية" busy={busy} />
    </div>
  );
}
