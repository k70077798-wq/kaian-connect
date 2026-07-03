import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search as SearchIcon, Loader2, Hash, User, Film, FileText, Image as ImgIcon } from "lucide-react";
import { PostContent } from "@/components/PostContent";

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
});

function SearchPage() {
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [hashtags, setHashtags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => { setQ(initialQ); }, [initialQ]);

  useEffect(() => {
    const term = q.trim().replace(/^[@#]/, "");
    if (!term) {
      setUsers([]); setPosts([]); setVideos([]); setImages([]); setHashtags([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const [{ data: u }, { data: p }] = await Promise.all([
        supabase.from("profiles")
          .select("id, full_name, username, avatar_url, verified, bio")
          .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
          .limit(20),
        supabase.from("posts")
          .select("id, user_id, content, image_url, video_url, live_stream_url, media_type, created_at")
          .ilike("content", `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      setUsers(u || []);

      const allPosts = p || [];
      const uids = [...new Set(allPosts.map((x: any) => x.user_id))];
      let pmap = new Map<string, any>();
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", uids);
        pmap = new Map((profs || []).map((x: any) => [x.id, x]));
      }
      const enriched = allPosts.map((x: any) => ({ ...x, profile: pmap.get(x.user_id) }));
      setPosts(enriched);
      setVideos(enriched.filter((x: any) => x.video_url || x.live_stream_url));
      setImages(enriched.filter((x: any) => x.image_url));

      // Hashtag aggregation
      const tagCount = new Map<string, number>();
      const re = new RegExp(`#([\\w\\u0600-\\u06FF][\\w\\u0600-\\u06FF-]*${term}[\\w\\u0600-\\u06FF-]*|${term}[\\w\\u0600-\\u06FF-]*)`, "gi");
      enriched.forEach((x: any) => {
        if (!x.content) return;
        const matches = x.content.matchAll(re);
        for (const m of matches) {
          const key = m[0].slice(1).toLowerCase();
          tagCount.set(key, (tagCount.get(key) || 0) + 1);
        }
      });
      setHashtags([...tagCount.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 10));

      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-3xl px-2 sm:px-4 py-4 space-y-4">
      <Card className="p-3 shadow-card">
        <div className="relative">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن مستخدم، هاشتاق، منشور، فيديو..." className="h-11 rounded-full bg-muted border-0 pr-10" autoFocus />
        </div>
      </Card>

      {loading && <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /> جاري البحث...</div>}

      {q.trim() && !loading && (
        <Tabs defaultValue="all">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="users"><User className="h-4 w-4 ms-1" /> مستخدمون ({users.length})</TabsTrigger>
            <TabsTrigger value="posts"><FileText className="h-4 w-4 ms-1" /> منشورات ({posts.length})</TabsTrigger>
            <TabsTrigger value="videos"><Film className="h-4 w-4 ms-1" /> فيديو ({videos.length})</TabsTrigger>
            <TabsTrigger value="images"><ImgIcon className="h-4 w-4 ms-1" /> صور ({images.length})</TabsTrigger>
            <TabsTrigger value="tags"><Hash className="h-4 w-4 ms-1" /> وسوم ({hashtags.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {hashtags.length > 0 && <HashtagsList items={hashtags} />}
            {users.length > 0 && <UsersList items={users.slice(0, 5)} />}
            {posts.length > 0 && <PostsList items={posts.slice(0, 8)} />}
            {!users.length && !posts.length && !hashtags.length && <Card className="p-12 text-center text-muted-foreground">لا توجد نتائج</Card>}
          </TabsContent>
          <TabsContent value="users" className="mt-4"><UsersList items={users} /></TabsContent>
          <TabsContent value="posts" className="mt-4"><PostsList items={posts} /></TabsContent>
          <TabsContent value="videos" className="mt-4"><PostsList items={videos} /></TabsContent>
          <TabsContent value="images" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((p: any) => (
                <Link key={p.id} to="/post/$postId" params={{ postId: p.id }}>
                  <img src={p.image_url} className="aspect-square w-full object-cover rounded-lg" alt="" />
                </Link>
              ))}
              {!images.length && <p className="col-span-3 text-center text-muted-foreground py-12">لا توجد صور</p>}
            </div>
          </TabsContent>
          <TabsContent value="tags" className="mt-4"><HashtagsList items={hashtags} /></TabsContent>
        </Tabs>
      )}

      {!q.trim() && <Card className="p-12 text-center text-muted-foreground">ابدأ الكتابة للبحث في المنصة</Card>}
    </div>
  );
}

function UsersList({ items }: { items: any[] }) {
  if (!items.length) return <Card className="p-8 text-center text-muted-foreground">لا يوجد مستخدمون</Card>;
  return (
    <div className="space-y-2">
      {items.map(u => (
        <Link key={u.id} to="/profile/$userId" params={{ userId: u.id }}>
          <Card className="p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
            <Avatar className="h-12 w-12">
              <AvatarImage src={u.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground">{(u.full_name || "K").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm flex items-center gap-1">
                {u.full_name || "مستخدم"}
                {u.verified && <span className="text-primary">✓</span>}
              </p>
              <p className="text-xs text-muted-foreground">@{u.username || "—"}</p>
              {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function PostsList({ items }: { items: any[] }) {
  if (!items.length) return <Card className="p-8 text-center text-muted-foreground">لا توجد نتائج</Card>;
  return (
    <div className="space-y-3">
      {items.map(p => (
        <Link key={p.id} to="/post/$postId" params={{ postId: p.id }}>
          <Card className="p-4 shadow-card hover:shadow-elegant transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{(p.profile?.full_name || "K").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-sm">{p.profile?.full_name || "مستخدم"}</p>
            </div>
            {p.content && <PostContent text={p.content} className="text-sm" postId={p.id} maxChars={180} />}
            {p.image_url && <img src={p.image_url} className="mt-2 rounded-lg max-h-60 w-full object-cover" alt="" />}
            {p.video_url && <div className="mt-2 rounded-lg overflow-hidden bg-black"><video src={p.video_url} className="w-full max-h-60" muted /></div>}
            {p.live_stream_url && <div className="mt-2 inline-flex items-center gap-1 rounded bg-red-600 text-white text-xs px-2 py-0.5 font-bold">🔴 بث مباشر</div>}
          </Card>
        </Link>
      ))}
    </div>
  );
}

function HashtagsList({ items }: { items: { tag: string; count: number }[] }) {
  if (!items.length) return <Card className="p-8 text-center text-muted-foreground">لا توجد وسوم</Card>;
  return (
    <div className="space-y-2">
      {items.map(t => (
        <Link key={t.tag} to="/hashtag/$tag" params={{ tag: t.tag }}>
          <Card className="p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">#{t.tag}</p>
              <p className="text-xs text-muted-foreground">{t.count} منشور</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
