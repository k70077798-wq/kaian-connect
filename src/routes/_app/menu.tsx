import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  Search, Settings, ChevronDown, LayoutDashboard, Users, Bookmark, History,
  Clapperboard, UsersRound, Newspaper, Store, Wallet, Megaphone, Briefcase,
  Flag, Calendar, Gamepad2, HelpCircle, LogOut, Shield, Moon, Sun, Bell,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_app/menu")({ component: MenuPage });

type Tile = {
  to: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  badge?: string;
  adminOnly?: boolean;
};

const TILES: Tile[] = [
  { to: "/dashboard", label: "لوحة المعلومات", icon: LayoutDashboard, color: "text-blue-500", bg: "bg-blue-500/10" },
  { to: "/friends", label: "الأصدقاء", icon: Users, color: "text-sky-500", bg: "bg-sky-500/10" },
  { to: "/reels", label: "ريلز", icon: Clapperboard, color: "text-violet-500", bg: "bg-violet-500/10" },
  { to: "/watch", label: "الفيديوهات", icon: Clapperboard, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { to: "/groups", label: "المجموعات", icon: UsersRound, color: "text-blue-500", bg: "bg-blue-500/10" },
  { to: "/pages", label: "الصفحات", icon: Flag, color: "text-pink-500", bg: "bg-pink-500/10" },
  { to: "/wallet", label: "المحفظة", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { to: "/ads-manager", label: "إعلاناتي", icon: Megaphone, color: "text-rose-500", bg: "bg-rose-500/10" },
  { to: "/messages", label: "الرسائل", icon: Newspaper, color: "text-blue-500", bg: "bg-blue-500/10" },
  { to: "/notifications", label: "الإشعارات", icon: Bell as any, color: "text-amber-600", bg: "bg-amber-500/10" },
];

function MenuPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [friendsOnline, setFriendsOnline] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { count: fc }, { data: pf }, { data: w }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("friendships").select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("page_followers").select("page_id, pages(id, name, avatar_url)").eq("user_id", user.id).limit(8),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p);
      setFriendsCount(fc || 0);
      setFriendsOnline(Math.floor((fc || 0) * 0.3));
      setShortcuts((pf || []).map((r: any) => r.pages).filter(Boolean));
      setBalance(Number(w?.balance ?? 0));
    })();
  }, [user?.id]);

  const visibleTiles = TILES.filter(t => !t.adminOnly || isAdmin);
  const shown = showAll ? visibleTiles : visibleTiles.slice(0, 8);

  const initials = (profile?.full_name || user?.email || "K").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => {}} className="grid h-10 w-10 place-items-center rounded-full bg-muted hover:bg-muted/80">
            <Search className="h-5 w-5" />
          </button>
          <button onClick={() => navigate({ to: "/settings" })} className="grid h-10 w-10 place-items-center rounded-full bg-muted hover:bg-muted/80">
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <h1 className="text-2xl font-black">القائمة</h1>
      </div>

      {/* Profile card */}
      <Card className="p-3">
        <button onClick={() => navigate({ to: "/profile" })} className="w-full flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white border-2 border-card">+</span>
          </div>
          <p className="flex-1 text-end font-bold text-base">{profile?.full_name || "مستخدم"}</p>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
            <ChevronDown className="h-5 w-5" />
          </span>
        </button>
      </Card>

      {/* Shortcuts */}
      {shortcuts.length > 0 && (
        <div>
          <p className="text-end text-sm font-bold text-muted-foreground mb-2">اختصاراتك</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" dir="rtl">
            {shortcuts.map((s: any) => (
              <Link key={s.id} to="/pages/$pageId" params={{ pageId: s.id }} className="shrink-0 w-20 text-center">
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-muted shadow-card">
                  {s.avatar_url ? <img src={s.avatar_url} className="h-full w-full object-cover" alt={s.name} /> : <div className="h-full w-full bg-brand-gradient" />}
                  <span className="absolute -bottom-1 -left-1 grid h-6 w-6 place-items-center rounded-md bg-orange-500 text-white">
                    <Flag className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="text-[11px] font-semibold mt-1 truncate">{s.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Wallet quick card */}
      <Link to="/wallet">
        <Card className="p-4 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/20">
            <Wallet className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1 text-end">
            <p className="text-xs text-muted-foreground">رصيد المحفظة</p>
            <p className="text-xl font-black">{balance.toFixed(2)} $</p>
          </div>
          <Button size="sm" className="bg-brand-gradient text-primary-foreground border-0">إدارة</Button>
        </Card>
      </Link>

      {/* Tiles grid */}
      <div className="grid grid-cols-2 gap-3">
        {shown.map(t => {
          const Icon = t.icon;
          const sub = t.to === "/friends" ? `(${friendsOnline} متصلاً)` : "";
          return (
            <Link key={t.to} to={t.to as any}>
              <Card className="p-4 h-full hover:bg-muted/50 transition">
                <div className={`h-10 w-10 rounded-xl grid place-items-center ${t.bg} mb-3 me-auto`}>
                  <Icon className={`h-5 w-5 ${t.color}`} />
                </div>
                <p className="font-bold text-[15px] text-end leading-tight">
                  {t.label} {sub && <span className="text-xs font-normal text-muted-foreground">{sub}</span>}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      {visibleTiles.length > 8 && (
        <Button variant="secondary" className="w-full" onClick={() => setShowAll(s => !s)}>
          {showAll ? "عرض أقل" : "عرض المزيد"}
        </Button>
      )}

      {/* Accordions */}
      <Accordion type="multiple" className="bg-card rounded-xl border">
        <AccordionItem value="help" className="border-b-0">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-muted"><HelpCircle className="h-4 w-4" /></span>
              <span className="flex-1 text-end font-bold">المساعدة والدعم</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-2 text-end">
            <Link to="/notifications" className="block py-2 hover:text-primary">مركز المساعدة</Link>
            <Link to="/settings" className="block py-2 hover:text-primary">الإبلاغ عن مشكلة</Link>
            <Link to="/settings" className="block py-2 hover:text-primary">شروط الخدمة وسياسات الخصوصية</Link>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="settings" className="border-b-0">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-muted"><Settings className="h-4 w-4" /></span>
              <span className="flex-1 text-end font-bold">الإعدادات والخصوصية</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-1 text-end">
            <button onClick={() => navigate({ to: "/settings" })} className="block w-full text-end py-2 hover:text-primary">الإعدادات</button>
            <button onClick={() => navigate({ to: "/profile" })} className="block w-full text-end py-2 hover:text-primary">الملف الشخصي</button>
            <button onClick={toggle} className="w-full flex items-center justify-between py-2 hover:text-primary">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {theme === "light" ? "تشغيل" : "إيقاف"}
              </span>
              <span>الوضع الداكن</span>
            </button>
            {isAdmin && (
              <button onClick={() => navigate({ to: "/admin" })} className="w-full flex items-center justify-end gap-2 py-2 text-primary">
                <span>لوحة تحكم الإدارة</span>
                <Shield className="h-4 w-4" />
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Logout */}
      <Button
        variant="secondary"
        className="w-full h-12 font-bold"
        onClick={async () => { await signOut(); navigate({ to: "/" }); }}
      >
        <LogOut className="h-4 w-4 ms-2" />
        تسجيل الخروج
      </Button>
    </div>
  );
}
