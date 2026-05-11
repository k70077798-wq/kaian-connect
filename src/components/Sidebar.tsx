import { Link } from "@tanstack/react-router";
import { Home, Users, Bookmark, Flag, Calendar, Store, Clapperboard, Gamepad2, Briefcase, Image as ImageIcon, UsersRound } from "lucide-react";

const items = [
  { to: "/home", icon: Home, label: "آخر الأخبار" },
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
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 space-y-1">
        {items.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to as any} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
