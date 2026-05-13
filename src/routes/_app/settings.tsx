import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, Palette, Check } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { theme, setTheme, color, setColor } = useTheme();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-3xl font-black">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">خصّص تجربتك على KAIAN.</p>
      </div>

      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">لون المنصة</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">اختر اللون الرسمي للمنصة.</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "brand", label: "اللون الرسمي", from: "from-rose-500", to: "to-orange-500" },
            { id: "blue", label: "الأزرق الكلاسيكي", from: "from-blue-600", to: "to-indigo-600" },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setColor(opt.id)}
              className={`relative rounded-2xl p-4 border-2 transition ${color === opt.id ? "border-primary" : "border-border hover:border-primary/40"}`}
            >
              <div className={`h-16 rounded-xl bg-gradient-to-br ${opt.from} ${opt.to}`} />
              <p className="mt-3 text-sm font-semibold">{opt.label}</p>
              {color === opt.id && (
                <span className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          {theme === "light" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
          <h2 className="font-bold text-lg">المظهر</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "light", label: "فاتح", icon: Sun },
            { id: "dark", label: "داكن", icon: Moon },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-3 rounded-2xl p-4 border-2 transition ${theme === opt.id ? "border-primary bg-accent/40" : "border-border hover:border-primary/40"}`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
                <opt.icon className="h-5 w-5" />
              </div>
              <span className="font-semibold">{opt.label}</span>
              {theme === opt.id && <Check className="h-4 w-4 text-primary mr-auto" />}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <h2 className="font-bold text-lg mb-2">عن المنصة</h2>
        <p className="text-sm text-muted-foreground">KAIAN — منصة التواصل الاجتماعي الفخمة. الإصدار 1.0</p>
      </Card>
    </div>
  );
}
