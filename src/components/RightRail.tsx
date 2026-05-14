import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Sparkles, UserPlus2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AddFriendButton } from "@/components/AddFriendButton";

interface SuggestedProfile { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null; }

export function RightRail() {
  const { user } = useAuth();
  const [suggested, setSuggested] = useState<SuggestedProfile[]>([]);

  const trends = [
    { tag: "#رمضان_كريم", count: "12.4K" },
    { tag: "#تقنية", count: "8.7K" },
    { tag: "#رياضة", count: "5.3K" },
    { tag: "#KAIAN", count: "4.1K" },
    { tag: "#السعودية", count: "3.9K" },
  ];

  const loadSuggested = async () => {
    if (!user) return;
    const { data: fs } = await supabase.from("friendships").select("requester_id, addressee_id").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const exclude = new Set([user.id, ...(fs || []).flatMap(f => [f.requester_id, f.addressee_id])]);
    const { data } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").limit(30);
    const filtered = ((data || []) as SuggestedProfile[]).filter(p => !exclude.has(p.id)).slice(0, 5);
    setSuggested(filtered);
  };

  useEffect(() => {
    if (!user) return;
    loadSuggested();
    const ch = supabase.channel("rail-suggestions")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadSuggested())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <aside className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-20 space-y-4">
        <Card className="p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus2 className="h-5 w-5 text-primary" />
            <h3 className="font-bold">أشخاص قد تعرفهم</h3>
          </div>
          {suggested.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">لا توجد اقتراحات حالياً</p>
          ) : (
            <ul className="space-y-3">
              {suggested.map(p => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <Link to="/profile/$userId" params={{ userId: p.id }} className="shrink-0">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{(p.full_name || "K").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/profile/$userId" params={{ userId: p.id }} className="block font-bold text-sm truncate hover:underline">
                      {p.full_name || "مستخدم"}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">@{p.username || "—"}</p>
                  </div>
                  <AddFriendButton userId={p.id} compact size="sm" />
                </li>
              ))}
            </ul>
          )}
          <Link to="/friends" className="block text-center mt-3 text-xs text-primary hover:underline">عرض الكل</Link>
        </Card>

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
