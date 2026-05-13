import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Users, Bookmark, Flag, Calendar, Store, Clapperboard, Gamepad2, Briefcase, Image as ImageIcon, UsersRound, Sun, Moon, User as UserIcon, Settings } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/home", icon: Home, label: "آخر الأخبار" },
  { to: "/reels", icon: Clapperboard, label: "الريلز", accent: true },
  { to: "/friends", icon: Users, label: "الأصدقاء" },
  { to: "/groups", icon: UsersRound, label: "المجموعات" },
  { to: "/pages", icon: Flag, label: "الصفحات" },
  { to: "/saved", icon: Bookmark, label: "المحفوظات" },
  { to: "/watch", icon: Clapperboard, label: "الفيديوهات" },
  { to: "/marketplace", icon: Store, label: "السوق" },
  { to: "/events", icon: Calendar, label: "الأحداث" },
  { to: "/games", icon: Gamepad2, label: "الألعاب" },
  { to: "/jobs", icon: Briefcase, label: "الوظائف" },
  { to: "/memories", icon: ImageIcon, label: "الذكريات" },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 space-y-1">
        {items.map(({ to, icon: Icon, label, accent }) => (
          <Link key={to + label} to={to as any} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${accent ? "bg-brand-gradient text-primary-foreground" : "bg-accent text-primary"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span>{label}</span>
          </Link>
        ))}

        <div className="my-3 h-px bg-border" />

        <p className="px-3 pb-1 text-[11px] font-bold text-muted-foreground">الخيارات</p>

        <button onClick={() => navigate({ to: "/profile" })} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
            <UserIcon className="h-4 w-4" />
          </div>
          <span>الملف الشخصي</span>
        </button>

        <button onClick={() => navigate({ to: "/settings" })} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
            <Settings className="h-4 w-4" />
          </div>
          <span>الإعدادات</span>
        </button>

        <button onClick={toggle} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </div>
          <span className="flex-1 text-start">{theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}</span>
          <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{theme === "light" ? "OFF" : "ON"}</span>
        </button>
      </div>
    </aside>
  );
}

