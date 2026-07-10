import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AddFriendButton } from "@/components/AddFriendButton";
import { MessageCircle, MapPin, Loader2 } from "lucide-react";
import { HlsPlayer } from "@/components/HlsPlayer";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_app/profile/$userId")({ component: UserProfilePage });

function UserProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.id === userId) { navigate({ to: "/profile" }); return; }
    (async () => {
      setLoading(true);
      const [{ data: prof }, { data: ps }, { data: fs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("friendships").select("*").eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      ]);
      setProfile(prof);
      setPosts(ps || []);
      const ids = (fs || []).map((f: any) => f.requester_id === userId ? f.addressee_id : f.requester_id);
      if (ids.length) {
        const { data: fp } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
        setFriends(fp || []);
      } else setFriends([]);
      setLoading(false);
    })();
  }, [userId, user?.id]);

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!profile) return <Card className="p-12 text-center text-muted-foreground mx-auto max-w-2xl mt-6">المستخدم غير موجود</Card>;

  const initials = (profile.full_name || "K").slice(0, 2).toUpperCase();
  const photos = posts.filter(p => p.image_url).slice(0, 9);
  const vStyle: "brand" | "gold" = profile.verified_style || "brand";

  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-4 py-0 sm:py-6">
      <Card className="overflow-hidden shadow-card rounded-none sm:rounded-2xl">
        <div className="h-52 sm:h-80 bg-brand-gradient relative">
          {(() => {
            const live = posts.find((p: any) => p.is_live && p.live_stream_url);
            if (live) return (
              <>
                <HlsPlayer src={live.live_stream_url} className="absolute inset-0 w-full h-full object-cover" muted={true} />
                <span className="absolute top-3 right-3 z-10 rounded bg-red-600 text-white text-xs px-2 py-1 font-bold animate-pulse">🔴 بث مباشر الآن</span>
              </>
            );
            return profile.cover_url ? <img src={profile.cover_url} className="absolute inset-0 w-full h-full object-cover" alt="" /> : null;
          })()}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="px-4 sm:px-8 pb-5 -mt-14 sm:-mt-20 flex flex-col-reverse sm:flex-row-reverse items-center sm:items-end gap-4 sm:gap-6">
          <Avatar className="h-32 w-32 sm:h-40 sm:w-40 ring-4 ring-card">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground text-4xl font-black">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-right mt-2 sm:mb-2">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black">{profile.full_name || "مستخدم"}</h1>
              {profile.verified && <VerifiedBadge style={vStyle} size={26} />}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <b className="text-foreground">{friends.length.toLocaleString("ar")}</b> صديق
              <span className="mx-2">·</span>@{profile.username || "—"}
            </p>
            {profile.bio && <p className="text-sm mt-2 max-w-prose">{profile.bio}</p>}
          </div>

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start sm:mb-2">
            <AddFriendButton userId={userId} size="default" />
            {user && friends.some((f: any) => f.id === user.id) && (
              <Button variant="outline" className="gap-2" onClick={openMessage}>
                <MessageCircle className="h-4 w-4" />مراسلة
              </Button>
            )}
          </div>
        </div>

        <div className="border-t px-2 sm:px-6">
          <Tabs defaultValue="all">
            <TabsList className="bg-transparent h-12 gap-1 justify-start overflow-x-auto">
              <TabsTrigger value="all" className="rounded-lg">المنشورات</TabsTrigger>
              <TabsTrigger value="photos" className="rounded-lg">الصور</TabsTrigger>
              <TabsTrigger value="friends" className="rounded-lg">الأصدقاء</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4 grid lg:grid-cols-[320px_1fr] gap-5 px-2 sm:px-0 pb-6">
              <div className="space-y-4 order-2 lg:order-1">
                <Card className="p-5 shadow-card">
                  <h3 className="font-bold mb-3">نبذة</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio || "لا يوجد وصف"}</p>
                </Card>
                <Card className="p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">الأصدقاء · {friends.length}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {friends.slice(0, 9).map(f => (
                      <Link key={f.id} to="/profile/$userId" params={{ userId: f.id }} className="flex flex-col items-center gap-1 hover:opacity-80">
                        <Avatar className="h-16 w-16 rounded-lg"><AvatarImage src={f.avatar_url ?? undefined} className="rounded-lg" /><AvatarFallback className="rounded-lg">{(f.full_name || "K").slice(0, 2)}</AvatarFallback></Avatar>
                        <span className="text-[11px] truncate w-full text-center">{f.full_name}</span>
                      </Link>
                    ))}
                    {friends.length === 0 && <p className="col-span-3 text-xs text-muted-foreground text-center py-3">لا يوجد أصدقاء</p>}
                  </div>
                </Card>
              </div>

              <div className="space-y-4 order-1 lg:order-2">
                {posts.length === 0 && <Card className="p-12 text-center text-muted-foreground">لا توجد منشورات</Card>}
                {posts.map(p => (
                  <Card key={p.id} className="p-4 shadow-card">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-10 w-10"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{initials}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-bold text-sm">{profile.full_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ar })}</p>
                      </div>
                    </div>
                    {p.content && <p className="text-[15px] whitespace-pre-wrap">{p.content}</p>}
                    {p.image_url && <img src={p.image_url} className="mt-2 w-full rounded-xl" alt="" />}
                    {p.video_url && <video src={p.video_url} controls className="mt-2 w-full rounded-xl" />}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="photos" className="mt-4 px-2 sm:px-0 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {photos.map(p => <img key={p.id} src={p.image_url} className="aspect-square w-full object-cover rounded-lg" alt="" />)}
                {photos.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">لا توجد صور</p>}
              </div>
            </TabsContent>

            <TabsContent value="friends" className="mt-4 px-2 sm:px-0 pb-6">
              <div className="grid sm:grid-cols-2 gap-2">
                {friends.map(f => (
                  <Card key={f.id} className="p-3 flex items-center gap-3">
                    <Link to="/profile/$userId" params={{ userId: f.id }}>
                      <Avatar className="h-12 w-12"><AvatarImage src={f.avatar_url ?? undefined} /><AvatarFallback>{(f.full_name || "K").slice(0, 2)}</AvatarFallback></Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to="/profile/$userId" params={{ userId: f.id }} className="font-bold hover:underline truncate block">{f.full_name}</Link>
                      <p className="text-xs text-muted-foreground truncate">@{f.username || "—"}</p>
                    </div>
                    <AddFriendButton userId={f.id} compact />
                  </Card>
                ))}
                {friends.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-12">لا يوجد أصدقاء</p>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
