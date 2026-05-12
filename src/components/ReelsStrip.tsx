import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Clapperboard, ChevronLeft } from "lucide-react";

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  content: string | null;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export function ReelsStrip() {
  const [reels, setReels] = useState<Reel[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, video_url, content")
        .not("video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data?.length) return;
      const ids = [...new Set(data.map((p) => p.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const m = new Map((profs || []).map((p) => [p.id, p]));
      setReels(data.map((p) => ({ ...p, profile: m.get(p.user_id) as any })) as Reel[]);
    })();
  }, []);

  if (!reels.length) return null;

  return (
    <Card className="p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-primary-foreground">
            <Clapperboard className="h-4 w-4" />
          </div>
          <h3 className="font-extrabold">الريلز</h3>
        </div>
        <Link to="/reels" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          الكل <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {reels.map((r) => (
          <Link
            key={r.id}
            to="/reels"
            search={{ start: r.id }}
            className="relative h-56 w-32 shrink-0 rounded-2xl overflow-hidden group bg-black"
          >
            <video src={r.video_url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <div className="absolute top-2 right-2">
              <Avatar className="h-8 w-8 ring-2 ring-white">
                <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">
                  {(r.profile?.full_name || "K").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black">
                <Play className="h-5 w-5 fill-current" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 left-2 text-white text-xs font-semibold line-clamp-2">
              {r.profile?.full_name || "مستخدم"}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
