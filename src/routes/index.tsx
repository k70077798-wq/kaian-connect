import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: WelcomePage });

function WelcomePage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home" });
  }, [loading, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error("بيانات الدخول غير صحيحة");
    toast.success("مرحباً بعودتك!");
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-soft-gradient">
      {/* Left visual panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-brand-gradient text-primary-foreground">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur text-2xl font-black">K</div>
          <span className="text-3xl font-black tracking-tight">KAIAN</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 className="text-5xl font-black leading-tight">تواصل مع الأصدقاء<br /><span className="opacity-90">وانطلق نحو لحظات أجمل.</span></h1>
          <p className="mt-4 max-w-md text-lg opacity-90">شارك أخبارك، ابنِ مجتمعك، واكتشف عالماً جديداً من العلاقات على KAIAN.</p>
        </motion.div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <p className="text-sm opacity-70 relative">© {new Date().getFullYear()} KAIAN — جميع الحقوق محفوظة</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-primary-foreground font-black">K</div>
            <span className="text-2xl font-black">KAIAN</span>
          </div>

          <h2 className="text-3xl font-black">مرحباً بعودتك! <span className="inline-block">👋</span></h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ليس لديك حساب؟ <Link to="/register" className="font-semibold text-primary hover:underline">سجّل الآن</Link>
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" placeholder="example@kaian.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl" placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox defaultChecked /> <span>تذكرني</span>
              </label>
              <a className="text-primary font-semibold hover:underline cursor-pointer">نسيت كلمة المرور؟</a>
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-brand-gradient hover:opacity-95 text-base font-bold shadow-elegant">
              {submitting ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            بدخولك توافق على <a className="underline">شروط الاستخدام</a> و <a className="underline">سياسة الخصوصية</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
