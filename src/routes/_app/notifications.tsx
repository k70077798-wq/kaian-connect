import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({ component: NotificationsPage });

interface Notif { id: string; user_id: string; type: string; content: string | null; link: string | null; read: boolean; created_at: string; }

const iconFor = (t: string) => {
  if (t === "like") return <Heart className="h-5 w-5 text-red-500" />;
  if (t === "comment") return <MessageCircle className="h-5 w-5 text-blue-500" />;
  if (t === "friend_request") return <UserPlus className="h-5 w-5 text-primary" />;
  if (t === "friend_accept") return <UserCheck className="h-5 w-5 text-green-500" />;
  return <Bell className="h-5 w-5 text-muted-foreground" />;
};

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems((data || []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel("notifs-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    toast.success("تم تعليم الكل كمقروء");
  };

  const open = async (n: Notif) => {
    if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    if (n.link) navigate({ to: n.link as any });
  };

  const unread = items.filter(i => !i.read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="p-4 shadow-card mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">الإشعارات</h1>
          <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} إشعار جديد` : "لا توجد إشعارات جديدة"}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2"><CheckCheck className="h-4 w-4" />تعليم الكل كمقروء</Button>
        )}
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">جاري التحميل...</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground shadow-card">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          لا توجد إشعارات بعد
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <Card key={n.id} onClick={() => open(n)} className={`p-4 flex items-start gap-3 cursor-pointer transition hover:bg-muted/50 ${!n.read ? "bg-primary/5 border-primary/30" : ""}`}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted shrink-0">{iconFor(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{n.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}</p>
              </div>
              {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-primary mt-2 shrink-0" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
