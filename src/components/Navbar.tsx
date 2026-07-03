import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Home, MessageCircle, Search, Users, Clapperboard, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null; }

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; username: string | null } | null>(null);
  const [unread, setUnread] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url, verified")
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq("id", user?.id || "")
        .limit(8);
      setResults((data || []) as SearchResult[]);
      setSearching(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, user?.id]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpenSearch(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (profile?.full_name || user?.email || "K").slice(0, 2).toUpperCase();
  const goToProfile = (id: string) => {
    navigate({ to: "/profile/$userId", params: { userId: id } });
    setOpenSearch(false); setQ("");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-xl shadow-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/home" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-primary-foreground font-black shadow-elegant">K</div>
          <span className="hidden text-xl font-extrabold tracking-tight sm:inline">
            KAI<span className="text-primary">A</span>N
          </span>
        </Link>

        <div ref={searchRef} className="relative mx-2 hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); setOpenSearch(true); }}
            onFocus={() => setOpenSearch(true)}
            onKeyDown={e => { if (e.key === "Enter" && q.trim()) { navigate({ to: "/search", search: { q } as any }); setOpenSearch(false); } }}
            className="h-10 rounded-full bg-muted/60 pr-10 border-0"
            placeholder="ابحث عن مستخدم، هاشتاق، منشور..."
          />
          {openSearch && q.trim() && (
            <div className="absolute top-full mt-2 w-full rounded-xl border bg-popover shadow-elegant overflow-hidden z-50">
              {searching ? (
                <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /> جاري البحث...</div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
              ) : (
                <ul className="max-h-96 overflow-y-auto">
                  {results.map(r => (
                    <li key={r.id}>
                      <button onClick={() => goToProfile(r.id)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-right transition-colors">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={r.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-brand-gradient text-primary-foreground text-sm">{(r.full_name || "K").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-sm truncate flex items-center gap-1">
                            {r.full_name || "مستخدم"}
                            {r.verified && <span className="text-primary">✓</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">@{r.username || "—"}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.trim() && (
                <button
                  onClick={() => { navigate({ to: "/search", search: { q } as any }); setOpenSearch(false); }}
                  className="w-full border-t px-3 py-2.5 text-sm font-semibold text-primary hover:bg-muted text-center"
                >
                  عرض جميع النتائج لـ "{q}"
                </button>
              )}
            </div>
          )}
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

        <button
          onClick={() => navigate({ to: "/menu" })}
          className="relative rounded-full ring-2 ring-transparent hover:ring-primary/40 transition"
          aria-label="القائمة"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground border-2 border-card text-[8px] font-black">≡</span>
        </button>
      </div>
    </header>
  );
}
