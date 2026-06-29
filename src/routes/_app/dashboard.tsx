import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Eye, Heart, MessageCircle, Share2, Users, FileText,
  Wallet, Megaphone, TrendingUp, Clapperboard, Bell, UserPlus, BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage });

interface Stats {
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  friends: number;
  followers: number;
  reels: number;
  campaigns: number;
  unreadNotifs: number;
  balance: number;
  earned: number;
  spent: number;
}

function StatCard({ icon: Icon, label, value, color, bg, hint }: any) {
  return (
    <Card className="p-4 hover:shadow-elegant transition">
      <div className="flex items-center justify-between mb-2">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [s, setS] = useState<Stats>({
    posts: 0, likes: 0, comments: 0, shares: 0, friends: 0, followers: 0,
    reels: 0, campaigns: 0, unreadNotifs: 0, balance: 0, earned: 0, spent: 0,
  });
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const uid = user.id;

      const [
        { data: p },
        { data: posts },
        { count: friendsC },
        { count: followersC },
        { count: reelsC },
        { count: campaignsC },
        { count: notifsC },
        { data: wallet },
        { data: txs },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("posts").select("id, content, media_url, created_at, likes_count, comments_count, shares_count").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("friendships").select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`).eq("status", "accepted"),
        supabase.from("page_followers").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", uid).not("video_url", "is", null),
        supabase.from("ad_campaigns").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("read", false),
        supabase.from("wallets").select("balance").eq("user_id", uid).maybeSingle(),
        supabase.from("wallet_transactions").select("amount, type, description, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      ]);

      const arr = posts || [];
      const likes = arr.reduce((a: number, x: any) => a + (x.likes_count || 0), 0);
      const comments = arr.reduce((a: number, x: any) => a + (x.comments_count || 0), 0);
      const shares = arr.reduce((a: number, x: any) => a + (x.shares_count || 0), 0);

      const earned = (txs || []).filter((t: any) => Number(t.amount) > 0).reduce((a: number, t: any) => a + Number(t.amount), 0);
      const spent = (txs || []).filter((t: any) => Number(t.amount) < 0).reduce((a: number, t: any) => a + Math.abs(Number(t.amount)), 0);

      setProfile(p);
      setS({
        posts: arr.length,
        likes, comments, shares,
        friends: friendsC || 0,
        followers: followersC || 0,
        reels: reelsC || 0,
        campaigns: campaignsC || 0,
        unreadNotifs: notifsC || 0,
        balance: Number(wallet?.balance ?? 0),
        earned, spent,
      });
      setTopPosts([...arr].sort((a: any, b: any) =>
        ((b.likes_count || 0) + (b.comments_count || 0) * 2 + (b.shares_count || 0) * 3) -
        ((a.likes_count || 0) + (a.comments_count || 0) * 2 + (a.shares_count || 0) * 3)
      ).slice(0, 5));
      setRecentActivity(txs || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const totalEngagement = s.likes + s.comments + s.shares;
  const views = totalEngagement * 7; // approximation
  const engagementRate = views > 0 ? ((totalEngagement / views) * 100).toFixed(1) : "0";
  const initials = (profile?.full_name || user?.email || "K").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4" dir="rtl">
      {/* Header */}
      <Card className="p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-primary/20">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black">لوحة المعلومات</h1>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              نظرة شاملة على نشاطك على KAIAN — {profile?.full_name || "مرحباً"}
            </p>
          </div>
          <Link to="/profile">
            <Button variant="secondary" size="sm">عرض الملف</Button>
          </Link>
        </div>
      </Card>

      {/* Main stats */}
      <div>
        <p className="text-sm font-bold text-muted-foreground mb-2">نظرة عامة</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Eye} label="مشاهدات تقديرية" value={loading ? "…" : views.toLocaleString()} color="text-blue-500" bg="bg-blue-500/10" hint="آخر 30 يوم" />
          <StatCard icon={Heart} label="إعجابات" value={loading ? "…" : s.likes.toLocaleString()} color="text-rose-500" bg="bg-rose-500/10" />
          <StatCard icon={MessageCircle} label="تعليقات" value={loading ? "…" : s.comments.toLocaleString()} color="text-emerald-500" bg="bg-emerald-500/10" />
          <StatCard icon={Share2} label="مشاركات" value={loading ? "…" : s.shares.toLocaleString()} color="text-violet-500" bg="bg-violet-500/10" />
        </div>
      </div>

      {/* Engagement */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> معدل التفاعل</p>
          <span className="text-2xl font-black text-primary">{engagementRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${Math.min(100, Number(engagementRate) * 4)}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div><p className="text-lg font-black">{s.posts}</p><p className="text-xs text-muted-foreground">منشور</p></div>
          <div><p className="text-lg font-black">{totalEngagement}</p><p className="text-xs text-muted-foreground">إجمالي التفاعل</p></div>
          <div><p className="text-lg font-black">{s.posts > 0 ? Math.round(totalEngagement / s.posts) : 0}</p><p className="text-xs text-muted-foreground">متوسط/منشور</p></div>
        </div>
      </Card>

      {/* Network */}
      <div>
        <p className="text-sm font-bold text-muted-foreground mb-2">شبكتك</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="أصدقاء" value={s.friends} color="text-sky-500" bg="bg-sky-500/10" />
          <StatCard icon={UserPlus} label="صفحات تتابعها" value={s.followers} color="text-pink-500" bg="bg-pink-500/10" />
          <StatCard icon={FileText} label="منشورات" value={s.posts} color="text-amber-600" bg="bg-amber-500/10" />
          <StatCard icon={Clapperboard} label="فيديوهات" value={s.reels} color="text-indigo-500" bg="bg-indigo-500/10" />
        </div>
      </div>

      {/* Wallet & Ads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link to="/wallet">
          <Card className="p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 h-full hover:shadow-elegant transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/20">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">رصيد المحفظة</p>
                <p className="text-2xl font-black">{s.balance.toFixed(2)} $</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-card/50 rounded-lg p-2 text-center">
                <p className="text-emerald-600 font-bold">+{s.earned.toFixed(2)}$</p>
                <p className="text-[10px] text-muted-foreground">أرباح</p>
              </div>
              <div className="bg-card/50 rounded-lg p-2 text-center">
                <p className="text-rose-500 font-bold">-{s.spent.toFixed(2)}$</p>
                <p className="text-[10px] text-muted-foreground">إنفاق</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/ads-manager">
          <Card className="p-5 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/30 h-full hover:shadow-elegant transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-500/20">
                <Megaphone className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">الحملات الإعلانية</p>
                <p className="text-2xl font-black">{s.campaigns}</p>
              </div>
            </div>
            <Button size="sm" className="w-full bg-brand-gradient text-primary-foreground border-0">إدارة الإعلانات</Button>
          </Card>
        </Link>
      </div>

      {/* Top posts */}
      {topPosts.length > 0 && (
        <Card className="p-5">
          <p className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> أفضل منشوراتك أداءً</p>
          <div className="space-y-2">
            {topPosts.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient text-primary-foreground font-black text-sm">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.content || "منشور بدون نص"}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes_count || 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.comments_count || 0}</span>
                    <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {p.shares_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> آخر العمليات</p>
          {s.unreadNotifs > 0 && (
            <Link to="/notifications" className="text-xs text-primary font-bold">{s.unreadNotifs} إشعار جديد</Link>
          )}
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد عمليات بعد</p>
        ) : (
          <div className="space-y-1">
            {recentActivity.slice(0, 6).map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className={`font-bold ${Number(t.amount) > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {Number(t.amount) > 0 ? "+" : ""}{Number(t.amount).toFixed(2)}$
                </span>
                <div className="flex-1 text-end">
                  <p className="text-sm">{t.description || t.type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
