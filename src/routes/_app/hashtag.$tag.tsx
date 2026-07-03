import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { PostContent } from "@/components/PostContent";

export const Route = createFileRoute("/_app/hashtag/$tag")({ component: HashtagPage });

function HashtagPage() {
  const { tag } = Route.useParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("posts")
        .select("*")
        .ilike("content", `%#${tag}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!data) { setPosts([]); setLoading(false); return; }
      const ids = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", ids);
      const pmap = new Map((profs || []).map((p: any) => [p.id, p]));
      setPosts(data.map((p: any) => ({ ...p, profile: pmap.get(p.user_id) })));
      setLoading(false);
    })();
  }, [tag]);

  return (
    <div className="mx-auto max-w-2xl px-2 sm:px-4 py-4 space-y-4">
      <Card className="p-6 shadow-card bg-brand-gradient text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Hash className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black">#{tag}</h1>
            <p className="text-sm opacity-90">{posts.length} منشور</p>
          </div>
        </div>
      </Card>

      {loading && <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
      {!loading && posts.length === 0 && <Card className="p-12 text-center text-muted-foreground">لا توجد منشورات بهذا الوسم</Card>}

      {posts.map(p => (
        <Link key={p.id} to="/post/$postId" params={{ postId: p.id }}>
          <Card className="p-4 shadow-card hover:shadow-elegant transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-gradient text-primary-foreground">{(p.profile?.full_name || "K").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{p.profile?.full_name || "مستخدم"}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ar })}</p>
              </div>
            </div>
            {p.content && <PostContent text={p.content} className="text-[15px]" postId={p.id} maxChars={200} />}
            {p.image_url && <img src={p.image_url} className="mt-2 w-full rounded-xl max-h-80 object-cover" alt="" />}
          </Card>
        </Link>
      ))}
    </div>
  );
}
