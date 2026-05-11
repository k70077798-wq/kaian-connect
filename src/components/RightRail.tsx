import { Card } from "@/components/ui/card";
import { TrendingUp, Sparkles } from "lucide-react";

export function RightRail() {
  const trends = [
    { tag: "#رمضان_كريم", count: "12.4K" },
    { tag: "#تقنية", count: "8.7K" },
    { tag: "#رياضة", count: "5.3K" },
    { tag: "#KAIAN", count: "4.1K" },
    { tag: "#السعودية", count: "3.9K" },
  ];
  return (
    <aside className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-20 space-y-4">
        <Card className="p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-bold">الأكثر تداولاً</h3>
          </div>
          <ul className="space-y-3">
            {trends.map(t => (
              <li key={t.tag} className="flex items-center justify-between text-sm hover:text-primary cursor-pointer transition-colors">
                <span className="font-semibold">{t.tag}</span>
                <span className="text-xs text-muted-foreground">{t.count} منشور</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="overflow-hidden p-5 bg-brand-gradient text-primary-foreground shadow-elegant">
          <Sparkles className="mb-2 h-6 w-6" />
          <h3 className="font-bold text-lg">KAIAN PRO</h3>
          <p className="text-sm opacity-90 mt-1">فعّل الميزات الاحترافية ووثّق حسابك.</p>
          <button className="mt-3 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-sm font-semibold backdrop-blur transition">ترقية الآن</button>
        </Card>
      </div>
    </aside>
  );
}
