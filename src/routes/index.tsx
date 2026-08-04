import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { AuthBrand, AuthShell, LOGO_URL } from "@/components/AuthShell";
import { Field, SocialRow } from "@/components/AuthBits";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | KAIAN — منصة التواصل الإجتماعي" },
      { name: "description", content: "سجّل الدخول إلى KAIAN لمشاركة منشوراتك، البث المباشر، والدردشة مع أصدقائك." },
      { property: "og:title", content: "تسجيل الدخول | KAIAN" },
      { property: "og:description", content: "منصة KAIAN للتواصل الاجتماعي — منشورات، ريلز، بث مباشر ورسائل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

// Only allow same-origin relative paths as `next`.
function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function WelcomePage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailError = touched.email && !/^\S+@\S+\.\S+$/.test(email.trim()) ? "أدخل بريدًا إلكترونيًا صحيحًا" : "";
  const passwordError = touched.password && password.length < 6 ? "كلمة المرور يجب ألا تقل عن 6 أحرف" : "";
  const formValid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6;

  const goNext = async (userId: string) => {
    const target = safeNext(next);
    if (target) return window.location.assign(target);
    const { data } = await supabase.from("profiles").select("onboarding_completed").eq("id", userId).maybeSingle();
    navigate({ to: data && data.onboarding_completed === false ? "/onboarding" : "/home" });
  };

  useEffect(() => {
    if (loading || !session) return;
    goNext(session.user.id);
  }, [loading, session, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!formValid) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) return toast.error("بيانات الدخول غير صحيحة");
    toast.success("مرحباً بعودتك!");
    if (data.user) await goNext(data.user.id);
  };

  const forgot = async () => {
    if (!email.trim()) return toast.error("أدخل بريدك الإلكتروني أولاً");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) return toast.error(error.message);
    toast.success("تم إرسال رابط استعادة كلمة المرور إلى بريدك");
  };

  const social = async (provider: "google" | "facebook" | "apple") => {
    if (provider !== "google") return toast.info("هذه الطريقة ستتوفر قريباً");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("تسجيل الدخول عبر Google غير مهيأ حالياً");
  };

  return (
    <AuthShell>
      <AuthBrand />

      <div className="mt-6 text-center">
        <h1 className="text-3xl font-black sm:text-4xl">
          <span className="text-primary">مرحباً</span> <span className="text-destructive">بعودتك!</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">سعداء لرؤيتك مرة أخرى 💙</p>
      </div>

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <Field label="البريد الإلكتروني" icon={<Mail className="h-5 w-5" />}>
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="أدخل بريدك الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
             onBlur={() => setTouched((value) => ({ ...value, email: true }))}
             aria-invalid={!!emailError}
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </Field>
         {emailError && <p className="-mt-2 text-xs font-medium text-destructive">{emailError}</p>}

        <Field label="كلمة المرور" icon={<Lock className="h-5 w-5" />}>
          <div className="flex items-center gap-2">
            <Input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
               onBlur={() => setTouched((value) => ({ ...value, password: true }))}
               aria-invalid={!!passwordError}
              className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
             <Button type="button" variant="ghost" size="icon" onClick={() => setShow((s) => !s)} aria-label="إظهار كلمة المرور" className="shrink-0 text-muted-foreground">
              {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
             </Button>
          </div>
        </Field>
         {passwordError && <p className="-mt-2 text-xs font-medium text-destructive">{passwordError}</p>}

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
            <span className="font-semibold">تذكّرني</span>
          </label>
          <button type="button" onClick={forgot} className="font-semibold text-destructive underline decoration-destructive/50 underline-offset-4">
            نسيت كلمة المرور؟
          </button>
        </div>

        <Button
          type="submit"
          disabled={submitting || !formValid}
          className="relative h-14 w-full rounded-2xl bg-brand-gradient text-lg font-black text-primary-foreground shadow-elegant hover:opacity-95"
        >
          <span className="absolute start-2 grid h-10 w-10 place-items-center rounded-full bg-card text-primary">
            <ArrowLeft className="h-5 w-5" />
          </span>
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {submitting ? "جاري الدخول..." : "تسجيل الدخول"}
        </Button>
      </form>

      <SocialRow onPick={social} />

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">ليس لديك حساب؟</p>
        <Link to="/register" className="mt-1 inline-block font-black text-primary underline decoration-destructive/60 underline-offset-8">
          إنشاء حساب جديد
        </Link>
      </div>

      <div className="mt-8 border-t pt-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <img src={LOGO_URL} alt="" className="h-7 w-auto object-contain" />
          <p className="text-xs font-bold">جميع الحقوق محفوظة © 2026</p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          صنع بكل <span className="text-destructive">♥️</span> من{" "}
          <span className="font-semibold text-primary">عبدالحميد داوؤد</span> — المنصة قيد التطوير والتحسين، شكراً لثقتكم بنا.
        </p>
      </div>
    </AuthShell>
  );
}
