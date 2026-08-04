import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Users, Flag, Clapperboard, UsersRound, Sun, Moon, User as UserIcon, Settings, Wallet, Megaphone, Search, Bell, MessageCircle, LayoutDashboard, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/home", icon: Home, label: "آخر الأخبار" },
  { to: "/reels", icon: Clapperboard, label: "الريلز", accent: true },
  { to: "/wallet", icon: Wallet, label: "المحفظة", accent: true },
  { to: "/ads-manager", icon: Megaphone, label: "إعلاناتي" },
  { to: "/dashboard", icon: LayoutDashboard, label: "لوحة المعلومات" },
  { to: "/friends", icon: Users, label: "الأصدقاء" },
  { to: "/groups", icon: UsersRound, label: "المجموعات" },
  { to: "/pages", icon: Flag, label: "الصفحات" },
  { to: "/watch", icon: Clapperboard, label: "الفيديوهات" },
  { to: "/messages", icon: MessageCircle, label: "الرسائل" },
  { to: "/notifications", icon: Bell, label: "الإشعارات" },
  { to: "/search", icon: Search, label: "البحث" },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const content = (
    <div className="space-y-1">
      {items.map(({ to, icon: Icon, label, accent }) => (
        <Link key={to + label} to={to as any} onClick={() => setMobileOpen(false)} aria-current={active(to) ? "page" : undefined} className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active(to) ? "bg-primary text-primary-foreground shadow-card" : "hover:bg-muted"}`}>
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active(to) ? "bg-primary-foreground/15" : accent ? "bg-brand-gradient text-primary-foreground" : "bg-accent text-primary"}`}><Icon className="h-4 w-4" /></div>
          <span className="truncate">{label}</span>
        </Link>
      ))}
      <div className="my-3 h-px bg-border" />
      <p className="px-3 pb-1 text-[11px] font-bold text-muted-foreground">الخيارات</p>
      <Link to="/profile" onClick={() => setMobileOpen(false)} className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active("/profile") ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><UserIcon className="h-4 w-4" /></div><span>الملف الشخصي</span></Link>
      <Link to="/settings" onClick={() => setMobileOpen(false)} className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active("/settings") ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Settings className="h-4 w-4" /></div><span>الإعدادات</span></Link>
      <Button onClick={toggle} variant="ghost" className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</div><span className="min-w-0 flex-1 text-start">{theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}</span><span className="shrink-0 text-[11px] text-muted-foreground">{theme === "light" ? "OFF" : "ON"}</span></Button>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block"><div className="sticky top-20">{content}</div></aside>
      <Button type="button" size="icon" className="fixed bottom-20 end-4 z-40 rounded-full shadow-elegant lg:hidden" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة"><Menu className="h-5 w-5" /></Button>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="إغلاق القائمة" className="absolute inset-0 bg-foreground/45" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 end-0 w-[min(86vw,320px)] overflow-y-auto border-s bg-background p-4 shadow-elegant"><div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center"><h2 className="truncate text-xl font-black">القائمة</h2><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="إغلاق"><X className="h-5 w-5" /></Button></div>{content}</aside></div>}
    </>
  );
}

