import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { AuthBrand, AuthShell } from "@/components/AuthShell";
import { Field, SocialRow } from "@/components/AuthBits";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "إنشاء حساب جديد | KAIAN" },
      { name: "description", content: "أنشئ حسابك على KAIAN وابدأ رحلتك: منشورات، ريلز، بث مباشر ورسائل مع أصدقائك." },
      { property: "og:title", content: "إنشاء حساب جديد | KAIAN" },
      { property: "og:description", content: "انضم إلى KAIAN وابدأ رحلتك الآن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "", gender: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const errors = {
    fullName: form.fullName.trim().length < 2 ? "الاسم يجب ألا يقل عن حرفين" : "",
    email: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? "أدخل بريدًا إلكترونيًا صحيحًا" : "",
    password: form.password.length < 6 ? "استخدم 6 أحرف على الأقل" : "",
    confirm: form.confirm !== form.password ? "كلمتا المرور غير متطابقتين" : "",
    agree: !agree ? "يجب الموافقة على الشروط والأحكام" : "",
  };
  const formValid = !Object.values(errors).some(Boolean);
  const touch = (field: string) => setTouched((value) => ({ ...value, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirm: true, agree: true });
    if (!form.fullName.trim()) return toast.error("أدخل اسمك الكامل");
    if (form.password.length < 6) return toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (form.password !== form.confirm) return toast.error("كلمتا المرور غير متطابقتين");
    if (!agree) return toast.error("يجب الموافقة على الشروط والأحكام");

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: form.fullName.trim(), gender: form.gender || null },
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء حسابك بنجاح!");
    navigate({ to: "/onboarding" });
  };

  const social = async (provider: "google" | "facebook" | "apple") => {
    if (provider !== "google") return toast.info("هذه الطريقة ستتوفر قريباً");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("التسجيل عبر Google غير مهيأ حالياً");
  };

  const genderBtn = (value: string, label: string, sign: string) => {
    const active = form.gender === value;
    return (
      <button
        type="button"
        onClick={() => set("gender", value)}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
          active ? "bg-brand-gradient text-primary-foreground shadow-elegant" : "text-foreground hover:bg-muted"
        }`}
      >
        <span className="text-lg leading-none">{sign}</span>
        {label}
      </button>
    );
  };

  return (
    <AuthShell
      topBar={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="رجوع"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-card"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm shadow-card"
          >
            <span className="text-muted-foreground">لديك حساب؟</span>
            <span className="font-bold text-primary">تسجيل الدخول</span>
            <ArrowLeft className="h-4 w-4 text-primary" />
          </Link>
        </div>
      }
    >
      <AuthBrand />

      <div className="mt-6 text-center">
        <h1 className="text-3xl font-black sm:text-4xl">
          <span className="text-primary">إنشاء</span> <span className="text-destructive">حساب</span>{" "}
          <span className="text-primary">جديد</span>
        </h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          انضم إلينا وابدأ رحلتك الآن
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="الاسم الكامل" icon={<User className="h-5 w-5" />}>
          <Input
            required
            placeholder="أدخل اسمك الكامل"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
             onBlur={() => touch("fullName")}
             aria-invalid={touched.fullName && !!errors.fullName}
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </Field>
         {touched.fullName && errors.fullName && <p className="-mt-2 text-xs font-medium text-destructive">{errors.fullName}</p>}

        <Field label="البريد الإلكتروني" icon={<Mail className="h-5 w-5" />}>
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="أدخل بريدك الإلكتروني"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
             onBlur={() => touch("email")}
             aria-invalid={touched.email && !!errors.email}
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </Field>
         {touched.email && errors.email && <p className="-mt-2 text-xs font-medium text-destructive">{errors.email}</p>}

        <Field label="كلمة المرور" icon={<Lock className="h-5 w-5" />}>
          <div className="flex items-center gap-2">
            <Input
              type={showPass ? "text" : "password"}
              required
              placeholder="أدخل كلمة المرور"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
               onBlur={() => touch("password")}
               aria-invalid={touched.password && !!errors.password}
              className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
             <Button type="button" variant="ghost" size="icon" aria-label="إظهار كلمة المرور" onClick={() => setShowPass((s) => !s)} className="shrink-0 text-muted-foreground">
              {showPass ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
             </Button>
          </div>
        </Field>
         {touched.password && errors.password ? <p className="-mt-2 text-xs font-medium text-destructive">{errors.password}</p> : form.password.length >= 6 && <p className="-mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" />كلمة مرور صالحة</p>}

        <Field label="تأكيد كلمة المرور" icon={<Lock className="h-5 w-5" />}>
          <div className="flex items-center gap-2">
            <Input
              type={showConfirm ? "text" : "password"}
              required
              placeholder="أعد إدخال كلمة المرور"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
               onBlur={() => touch("confirm")}
               aria-invalid={touched.confirm && !!errors.confirm}
              className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
             <Button type="button" variant="ghost" size="icon" aria-label="إظهار التأكيد" onClick={() => setShowConfirm((s) => !s)} className="shrink-0 text-muted-foreground">
              {showConfirm ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
             </Button>
          </div>
        </Field>
         {touched.confirm && errors.confirm ? <p className="-mt-2 text-xs font-medium text-destructive">{errors.confirm}</p> : form.confirm && !errors.confirm && <p className="-mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" />كلمتا المرور متطابقتان</p>}

        <div className="space-y-1.5">
          <p className="text-sm font-bold text-primary">الجنس</p>
          <div className="field-shell flex items-center gap-2 rounded-2xl p-1.5">
            {genderBtn("male", "ذكر", "♂")}
            <span className="h-8 w-px bg-border" />
            {genderBtn("female", "أنثى", "♀")}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <Checkbox checked={agree} onCheckedChange={(v) => { setAgree(Boolean(v)); touch("agree"); }} className="mt-0.5" />
          <span>
            أوافق على <span className="font-bold text-primary">الشروط والأحكام</span> و
            <span className="font-bold text-destructive"> سياسة الخصوصية</span>
          </span>
        </label>
         {touched.agree && errors.agree && <p className="-mt-2 text-xs font-medium text-destructive">{errors.agree}</p>}

        <Button
          type="submit"
          disabled={submitting || !formValid}
          className="h-14 w-full gap-2 rounded-2xl bg-brand-gradient text-lg font-black text-primary-foreground shadow-elegant hover:opacity-95"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          {submitting ? "جاري الإنشاء..." : "إنشاء حساب"}
        </Button>
      </form>

      <SocialRow onPick={social} />

      <p className="mt-6 text-center text-sm">
        لديك حساب بالفعل؟{" "}
        <Link to="/" className="font-black text-destructive underline decoration-destructive/50 underline-offset-4">
          تسجيل الدخول
        </Link>
      </p>
    </AuthShell>
  );
}
