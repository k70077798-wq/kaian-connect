import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Megaphone, ExternalLink } from "lucide-react";

interface AdRow {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  cta: string | null;
  status: string;
  profile?: { full_name: string | null; username: string | null; avatar_url: string | null };
}

export function SponsoredAd({ ad }: { ad: AdRow }) {
  const seenRef = useRef(false);
  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    supabase.rpc("ad_impression", { _id: ad.id });
  }, [ad.id]);

  const onClick = async () => {
    await supabase.rpc("ad_click", { _id: ad.id });
    if (ad.link_url) window.open(ad.link_url, "_blank", "noopener,noreferrer");
  };

  const initials = (s?: string | null) => (s || "K").slice(0, 2).toUpperCase();

  return (
    <Card className="p-4 shadow-card border-primary/20">
      <div className="flex items-start justify-between mb-2">
        <Link to="/profile/$userId" params={{ userId: ad.user_id }} className="flex items-center gap-3 group">
          <Avatar className="h-11 w-11">
            <AvatarImage src={ad.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">
              {initials(ad.profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-sm group-hover:underline">{ad.profile?.full_name || "معلِن"}</p>
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px] gap-1 mt-0.5">
              <Megaphone className="h-2.5 w-2.5" /> ممول
            </Badge>
          </div>
        </Link>
      </div>

      <h3 className="font-bold text-base mb-1">{ad.title}</h3>
      {ad.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.content}</p>}

      {ad.image_url && (
        <button onClick={onClick} className="block w-full mt-3">
          <img src={ad.image_url} alt={ad.title} className="w-full rounded-xl object-cover" />
        </button>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground truncate">
          {ad.link_url ? new URL(ad.link_url).hostname.replace(/^www\./, "") : "إعلان مموّل"}
        </p>
        <Button size="sm" onClick={onClick} className="bg-brand-gradient text-primary-foreground border-0 gap-1">
          {ad.cta || "اعرف المزيد"}
          {ad.link_url && <ExternalLink className="h-3 w-3" />}
        </Button>
      </div>
    </Card>
  );
}
