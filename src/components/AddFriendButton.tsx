import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Status = "none" | "friends" | "outgoing" | "incoming" | "self" | "loading";

interface Props {
  userId: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  compact?: boolean;
}

export function AddFriendButton({ userId, size = "sm", variant = "default", className, compact }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!user) return;
    if (user.id === userId) { setStatus("self"); return; }
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    if (!data) { setStatus("none"); setFriendshipId(null); return; }
    setFriendshipId(data.id);
    if (data.status === "accepted") setStatus("friends");
    else if (data.requester_id === user.id) setStatus("outgoing");
    else setStatus("incoming");
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`afb-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => refresh());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, userId]);

  if (status === "self" || status === "loading" || !user) return null;

  const send = async () => {
    setBusy(true);
    const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: userId, status: "pending" });
    setBusy(false);
    if (error) return toast.error("تعذر إرسال الطلب");
    toast.success("تم إرسال طلب الصداقة");
  };
  const accept = async () => {
    if (!friendshipId) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    setBusy(false);
    if (error) return toast.error("تعذر القبول");
    toast.success("تم قبول الصداقة");
  };
  const remove = async () => {
    if (!friendshipId) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    setBusy(false);
    if (error) return toast.error("تعذر الحذف");
  };

  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };

  if (status === "friends") {
    return (
      <Button onClick={(e) => { stop(e); remove(); }} disabled={busy} size={size} variant="outline" className={className}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
        {!compact && <span className="ms-1.5">صديق</span>}
      </Button>
    );
  }
  if (status === "outgoing") {
    return (
      <Button onClick={(e) => { stop(e); remove(); }} disabled={busy} size={size} variant="outline" className={className}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
        {!compact && <span className="ms-1.5">إلغاء الطلب</span>}
      </Button>
    );
  }
  if (status === "incoming") {
    return (
      <div className="flex gap-1.5" onClick={stop}>
        <Button onClick={(e) => { stop(e); accept(); }} disabled={busy} size={size} className="bg-brand-gradient">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {!compact && <span className="ms-1.5">قبول</span>}
        </Button>
        <Button onClick={(e) => { stop(e); remove(); }} disabled={busy} size={size} variant="outline">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={(e) => { stop(e); send(); }} disabled={busy} size={size} variant={variant} className={`${variant === "default" ? "bg-brand-gradient" : ""} ${className || ""}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
      {!compact && <span className="ms-1.5">إضافة صديق</span>}
    </Button>
  );
}
