import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, MessageCircle, Users, X } from "lucide-react";

const TIPS = [
  { icon: Radio, title: "ابدأ بثاً مباشراً", text: "اضغط زر «بث مباشر» في صندوق النشر لتبث من كاميرة هاتفك فوراً." },
  { icon: MessageCircle, title: "راسل أصدقاءك", text: "افتح أيقونة الرسائل في الأعلى للدردشة والمكالمات الصوتية والمرئية." },
  { icon: Users, title: "كوّن شبكتك", text: "أضف أصدقاء واتبع الصفحات ليصبح موجزك مليئاً بما يهمك." },
];

export function HomeTips() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    supabase.from("profiles").select("tips_seen").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (active && data && data.tips_seen === false) setOpen(true);
    });
    return () => { active = false; };
  }, [loading, user?.id]);

  const close = async () => {
    setOpen(false);
    if (user) await supabase.from("profiles").update({ tips_seen: true }).eq("id", user.id);
  };

  if (!open) return null;
  const tip = TIPS[idx];
  const Icon = tip.icon;
  const last = idx === TIPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" dir="rtl">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-elegant"
        >
          <button onClick={close} aria-label="إغلاق" className="absolute left-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-card">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-black">{tip.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{tip.text}</p>

          <div className="mt-5 flex items-center justify-center gap-1.5">
            {TIPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <Button onClick={() => (last ? close() : setIdx(idx + 1))} className="flex-1 h-11 rounded-xl bg-brand-gradient font-bold">
              {last ? "ابدأ الآن" : "التالي"}
            </Button>
            <Button onClick={close} variant="ghost" className="h-11 rounded-xl">تخطي</Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
