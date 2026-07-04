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
import { Sparkles, Users, MessageCircle, Zap } from "lucide-react";

export const Route = createFileRoute("/")({ component: WelcomePage });

const LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh8iH2aqvCzmEns7KC2YENagCnERIJOCzCHQk5ZkHIoGpf3pBNUwRj2LlMXr8r7NI2JFNWClKqPqtUoIu3kfxW-iYfogd0JPiZP9C5zm0gGkhUFRT-2fAmjmB3izc1mj2JzPQ0Jw0pK4aMGrMV-_J5vSbl3wh1IqshyaIDUDZ_TFNZVDajmZ6gCr9zSj10/s320/%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A7%D9%A0%D9%A3_%D9%A2%D9%A1%D9%A4%D9%A2%D9%A0%D9%A3.png";
const HERO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgbyUS-EUAeNo2fwIeaFaibkJS6YkDs5z4QQKeqVXUknyT6cMk3kYiyyIZqsgGEjwi4a1BdH4BOV-6WhthAKwH1Fq1OPWCCD6XKAx2BVr73Kxm2DZ17HaC_S0feiv2_lCXDXqb-vppwn7zFOmjVlUKlF2MigTciIDDFEsIVaTRnm2NYOdr0K9C7Bek3yWI/s320/%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A7%D9%A0%D9%A3_%D9%A2%D9%A1%D9%A4%D9%A1%D9%A0%D9%A6.png";

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
    <div className="min-h-screen flex flex-col bg-soft-gradient" dir="rtl">
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left visual panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-brand-gradient text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 relative z-10">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-1 shadow-elegant">
              <img src={LOGO_URL} alt="KAIAN logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="block text-3xl font-black tracking-tight leading-none">KAIAN</span>
              <span className="text-xs opacity-80">منصة التواصل الاجتماعي</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="relative z-10 my-8 flex justify-center"
          >
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-white/10 blur-2xl" />
              <img
                src={HERO_URL}
                alt="KAIAN"
                className="relative h-64 w-64 xl:h-80 xl:w-80 object-contain drop-shadow-2xl"
                loading="eager"
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative z-10">
            <h1 className="text-4xl xl:text-5xl font-black leading-tight">
              تواصل مع الأصدقاء
              <br />
              <span className="opacity-90">وانطلق نحو لحظات أجمل.</span>
            </h1>
            <p className="mt-4 max-w-md text-base xl:text-lg opacity-90">
              شارك أخبارك، ابنِ مجتمعك، واكتشف عالماً جديداً من العلاقات على KAIAN.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              {[
                { i: Users, t: "أصدقاء ومجتمعات" },
                { i: MessageCircle, t: "رسائل ومكالمات" },
                { i: Sparkles, t: "ريلز وقصص" },
                { i: Zap, t: "بث مباشر" },
              ].map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-3 py-2 text-sm">
                  <f.i className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{f.t}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="lg:hidden mb-8 flex flex-col items-center gap-3 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient p-2 shadow-elegant">
                <img src={LOGO_URL} alt="KAIAN" className="h-full w-full object-contain rounded-2xl bg-white/10" />
              </div>
              <div>
                <span className="text-3xl font-black block">KAIAN</span>
                <span className="text-xs text-muted-foreground">منصة التواصل الاجتماعي</span>
              </div>
            </div>

            <h2 className="text-3xl font-black">
              مرحباً بعودتك! <span className="inline-block">👋</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                سجّل الآن
              </Link>
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" placeholder="example@kaian.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" placeholder="••••••••" />
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
              بدخولك توافق على <a className="underline">شروط الاستخدام</a> و{" "}
              <a className="underline">سياسة الخصوصية</a>.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2 text-sm">
            <img src={LOGO_URL} alt="" className="h-8 w-8 rounded-lg object-contain bg-white shadow-card" />
            <div>
              <p className="font-bold">جميع الحقوق محفوظة © 2026</p>
              <p className="text-xs text-muted-foreground">
                صنع بكل <span className="text-red-500">♥️</span> من{" "}
                <span className="font-semibold text-primary">عبدالحميد داوؤد</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            المنصة قيد التطوير والتحسين — شكراً لثقتكم بنا.
          </p>
        </div>
      </footer>
    </div>
  );
}
