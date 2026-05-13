import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Home, MessageCircle, Search, LogOut, User as UserIcon, Shield, Users, Image as ImageIcon, Clapperboard } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; username: string | null } | null>(null);
  const [unread, setUnread] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url, username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    const refreshNotif = async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      setUnread(count || 0);
    };
    const refreshFriends = async () => {
      const { count } = await supabase.from("friendships").select("*", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending");
      setPendingFriends(count || 0);
    };
    refreshNotif(); refreshFriends();
    const ch = supabase.channel("navbar-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refreshNotif)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, refreshFriends)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const initials = (profile?.full_name || user?.email || "K").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-xl shadow-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/home" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-primary-foreground font-black shadow-elegant">K</div>
          <span className="hidden text-xl font-extrabold tracking-tight sm:inline">
            KAI<span className="text-primary">A</span>N
          </span>
        </Link>

        <div className="relative mx-2 hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 rounded-full bg-muted/60 pr-10 border-0" placeholder="ابحث عن أصدقاء، صفحات، مجموعات..." />
        </div>

        <nav className="flex items-center gap-1 mx-auto">
          <Link to="/home" className="rounded-xl p-2.5 hover:bg-muted transition-colors" aria-label="الرئيسية"><Home className="h-5 w-5" /></Link>
          <Link to="/friends" className="relative rounded-xl p-2.5 hover:bg-muted transition-colors" aria-label="الأصدقاء">
            <Users className="h-5 w-5" />
            {pendingFriends > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{pendingFriends}</span>}
          </Link>
          <Link to="/messages" className="rounded-xl p-2.5 hover:bg-muted transition-colors" aria-label="الرسائل"><MessageCircle className="h-5 w-5" /></Link>
          <Link to="/notifications" className="relative rounded-xl p-2.5 hover:bg-muted transition-colors" aria-label="الإشعارات">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
          </Link>
        </nav>

        <Link to="/reels" className="rounded-xl p-2.5 hover:bg-muted transition-colors text-primary" aria-label="ريلز">
          <Clapperboard className="h-5 w-5" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full ring-2 ring-transparent hover:ring-primary/30 transition">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold">{profile?.full_name || "مستخدم"}</p>
              <p className="text-xs text-muted-foreground">@{profile?.username || "—"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><UserIcon className="ms-2 h-4 w-4" />ملفي الشخصي</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/pages" })}><ImageIcon className="ms-2 h-4 w-4" />صفحاتي</DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                <Shield className="ms-2 h-4 w-4 text-primary" />لوحة التحكم
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="ms-2 h-4 w-4" />تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
