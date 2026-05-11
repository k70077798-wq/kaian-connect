import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirm: "", gender: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("كلمتا المرور غير متطابقتين");
    if (form.password.length < 6) return toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: `${form.firstName} ${form.lastName}`.trim() },
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء حسابك بنجاح!");
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-soft-gradient">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-gradient text-primary-foreground overflow-hidden">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur text-2xl font-black">K</div>
          <span className="text-3xl font-black">KAIAN</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 className="text-5xl font-black leading-tight">انضم إلى KAIAN<br /><span className="opacity-90">وابدأ قصتك اليوم.</span></h1>
          <p className="mt-4 max-w-md text-lg opacity-90">شارك ما هو جديد، لحظات الحياة مع أصدقائك.</p>
        </motion.div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <p className="text-sm opacity-70 relative">© {new Date().getFullYear()} KAIAN</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <h2 className="text-4xl font-black text-primary">إنشاء حساب</h2>
          <p className="mt-2 text-sm text-muted-foreground">أنشئ حسابك على KAIAN!</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>الاسم الأول</Label>
                <Input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>الاسم الأخير</Label>
                <Input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور</Label>
              <Input type="password" required value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>الجنس</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-brand-gradient text-base font-bold shadow-elegant hover:opacity-95">
              {submitting ? "جاري الإنشاء..." : "هيا بنا!"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            لديك حساب بالفعل؟ <Link to="/" className="font-semibold text-primary hover:underline">تسجيل الدخول</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
