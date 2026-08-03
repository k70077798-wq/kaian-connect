import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X, Settings, ChevronDown, ChevronLeft, LayoutDashboard, Users, Bookmark, History,
  Clapperboard, UsersRound, Newspaper, Wallet, Megaphone, Radio,
  Flag, Calendar, Gamepad2, HelpCircle, LogOut, Shield, Moon, Sun, Bell, BadgeCheck, User as UserIcon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_app/menu")({ component: MenuPage });

type Tile = { to: string; label: string; icon: any; color: string; adminOnly?: boolean };

/** Top circular shortcuts (like the reference "اختصاراتك" row). */
const QUICK: Tile[] = [
  { to: "/friends", label: "أصدقاء مقربون", icon: Users, color: "bg-destructive" },
  { to: "/games", label: "الألعاب", icon: Gamepad2, color: "bg-emerald-500" },
  { to: "/marketplace", label: "عروض اليوم", icon: Bookmark, color: "bg-orange-500" },
  { to: "/groups", label: "المجموعات", icon: UsersRound, color: "bg-primary" },
  { to: "/saved", label: "المحفوظات", icon: Bookmark, color: "bg-violet-500" },
];

const TILES: Tile[] = [
  { to: "/groups", label: "المجموعات", icon: UsersRound, color: "text-primary" },
  { to: "/events", label: "الأحداث", icon: Calendar, color: "text-destructive" },
  { to: "/friends", label: "الأصدقاء", icon: Users, color: "text-primary" },
  { to: "/pages", label: "الصفحات", icon: Flag, color: "text-orange-500" },
  { to: "/memories", label: "الذكريات", icon: History, color: "text-primary" },
  { to: "/watch", label: "الفيديو", icon: Clapperboard, color: "text-primary" },
  { to: "/saved", label: "العناصر المحفوظة", icon: Bookmark, color: "text-violet-500" },
  { to: "/marketplace", label: "السوق", icon: Newspaper, color: "text-primary" },
  { to: "/games", label: "الألعاب", icon: Gamepad2, color: "text-emerald-500" },
  { to: "/jobs", label: "الوظائف", icon: Newspaper, color: "text-amber-600" },
  { to: "/reels", label: "ريلز", icon: Radio, color: "text-destructive" },
  { to: "/ads-manager", label: "مركز الإعلانات", icon: Megaphone, color: "text-primary" },
  { to: "/dashboard", label: "لوحة المعلومات", icon: LayoutDashboard, color: "text-primary" },
  { to: "/notifications", label: "الإشعارات", icon: Bell, color: "text-amber-600" },
  { to: "/messages", label: "الرسائل", icon: Newspaper, color: "text-primary" },
  { to: "/wallet", label: "المحفظة", icon: Wallet, color: "text-emerald-600" },
];

function MenuPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: w }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p);
      setBalance(Number(w?.balance ?? 0));
    })();
  }, [user?.id]);

  const visible = TILES.filter((t) => !t.adminOnly || isAdmin);
  const shown = showAll ? visible : visible.slice(0, 12);
  const initials = (profile?.full_name || user?.email || "K").slice(0, 2).toUpperCase();

  const rows: { label: string; icon: any; onClick: () => void }[] = [
    { label: "الإعدادات والخصوصية", icon: Settings, onClick: () => navigate({ to: "/settings" }) },
    { label: "المساعدة والدعم", icon: HelpCircle, onClick: () => navigate({ to: "/settings" }) },
  ];

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 pb-24 space-y-4" dir="rtl">
      {/* Header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="إغلاق"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted hover:bg-muted/70"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="truncate text-end text-2xl font-black sm:text-3xl">القائمة</h1>
      </div>

      {/* Profile card */}
      <Card className="p-3 shadow-card">
        <button onClick={() => navigate({ to: "/profile" })} className="flex w-full items-center gap-3">
          <Avatar className="h-16 w-16 shrink-0 ring-2 ring-primary/25">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient font-bold text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-end">
            <p className="flex items-center justify-end gap-1.5 truncate text-lg font-black">
              {profile?.full_name || "مستخدم"}
              <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
            </p>
            <p className="mt-0.5 flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
              عرض ملفك الشخصي
              <UserIcon className="h-4 w-4" />
            </p>
          </div>
        </button>
      </Card>

      {/* Wallet */}
      <Link to="/wallet">
        <Card className="flex items-center gap-3 border-primary/20 bg-brand-gradient/5 p-4 shadow-card">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 text-end">
            <p className="text-xs text-muted-foreground">رصيد المحفظة</p>
            <p className="text-xl font-black">{balance.toFixed(2)} $</p>
          </div>
          <Button size="sm" className="shrink-0 bg-brand-gradient text-primary-foreground">إدارة</Button>
        </Card>
      </Link>

      {/* Quick circular shortcuts */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Link to="/settings" className="text-sm font-bold text-primary">تعديل</Link>
          <p className="text-sm font-black">اختصاراتك</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.label} to={q.to as any} className="w-24 shrink-0">
                <Card className="grid place-items-center gap-2 p-3 shadow-card transition hover:-translate-y-0.5">
                  <span className={`grid h-12 w-12 place-items-center rounded-full ${q.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="w-full truncate text-center text-[11px] font-bold">{q.label}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* All shortcuts */}
      <div>
        <p className="mb-2 text-end text-sm font-black">كل الاختصارات</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {shown.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.label + t.to} to={t.to as any}>
                <Card className="grid h-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3.5 shadow-card transition hover:bg-muted/50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent">
                    <Icon className={`h-5 w-5 ${t.color}`} />
                  </span>
                  <p className="truncate text-end text-[15px] font-bold">{t.label}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        {visible.length > 12 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-primary"
          >
            <ChevronDown className={`h-4 w-4 transition ${showAll ? "rotate-180" : ""}`} />
            {showAll ? "عرض أقل" : "عرض المزيد"}
          </button>
        )}
      </div>

      {/* Settings rows */}
      <div className="divide-y rounded-2xl border bg-card">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <button key={r.label} onClick={r.onClick} className="flex w-full items-center gap-3 px-4 py-4 hover:bg-muted/50">
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-end font-bold">{r.label}</span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                <Icon className="h-4 w-4" />
              </span>
            </button>
          );
        })}

        <button onClick={toggle} className="flex w-full items-center gap-3 px-4 py-4 hover:bg-muted/50">
          <span className="shrink-0 text-xs text-muted-foreground">{theme === "light" ? "تشغيل" : "إيقاف"}</span>
          <span className="min-w-0 flex-1 truncate text-end font-bold">الوضع الداكن</span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </span>
        </button>

        {isAdmin && (
          <button onClick={() => navigate({ to: "/admin" })} className="flex w-full items-center gap-3 px-4 py-4 text-primary hover:bg-muted/50">
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-end font-bold">لوحة تحكم الإدارة</span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent">
              <Shield className="h-4 w-4" />
            </span>
          </button>
        )}

        <button
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          className="flex w-full items-center gap-3 px-4 py-4 text-destructive hover:bg-muted/50"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-end font-bold">تسجيل الخروج</span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div className="pt-2 text-center text-[11px] text-muted-foreground">
        <p>الخصوصية · الشروط · الإعلانات · اختيارات الإعلانات</p>
        <p className="mt-1 font-bold">KAIAN © 2026</p>
      </div>
    </div>
  );
}
