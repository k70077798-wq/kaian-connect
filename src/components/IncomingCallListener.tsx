import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CallModal } from "@/components/CallModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";

type Incoming = {
  peer: string;
  peerName: string;
  peerAvatar: string | null;
  kind: "audio" | "video";
  conversationId: string;
  payload: any;
};

/**
 * Global incoming-call listener. Renders a ringing dialog and, on accept,
 * opens the CallModal for the callee. Mounted once at the app layout level
 * so users are notified anywhere in the app.
 */
export function IncomingCallListener() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [inCall, setInCall] = useState<Incoming | null>(null);
  const [ringAudio] = useState(() => {
    if (typeof Audio === "undefined") return null;
    const a = new Audio("data:audio/wav;base64,UklGRlwEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTgEAAA=");
    a.loop = true;
    return a;
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`incoming-call-global-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        async (p) => {
          const sig: any = p.new;
          if (sig.kind !== "offer") return;
          // Ignore if already in a call/ring
          if (inCall || incoming) return;
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name,username,avatar_url")
            .eq("id", sig.from_user)
            .maybeSingle();
          const info: Incoming = {
            peer: sig.from_user,
            peerName: prof?.full_name || prof?.username || "مكالمة واردة",
            peerAvatar: prof?.avatar_url ?? null,
            kind: sig.payload?.video ? "video" : "audio",
            conversationId: sig.conversation_id,
            payload: sig.payload,
          };
          setIncoming(info);
          toast(`📞 مكالمة ${info.kind === "video" ? "فيديو" : "صوتية"} من ${info.peerName}`);
          try { await ringAudio?.play(); } catch {}
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        (p) => {
          const sig: any = p.new;
          if (sig.kind === "hangup" || sig.kind === "decline") {
            setIncoming(null);
            try { ringAudio?.pause(); if (ringAudio) ringAudio.currentTime = 0; } catch {}
          }
        },
      );
    ch.subscribe();
    return () => { supabase.removeChannel(ch); try { ringAudio?.pause(); } catch {} };
  }, [user, incoming, inCall, ringAudio]);

  const stopRing = () => { try { ringAudio?.pause(); if (ringAudio) ringAudio.currentTime = 0; } catch {} };

  const accept = () => {
    if (!incoming) return;
    stopRing();
    setInCall(incoming);
    setIncoming(null);
  };
  const decline = async () => {
    if (!incoming || !user) return;
    stopRing();
    await supabase.from("call_signals").insert({
      conversation_id: incoming.conversationId,
      from_user: user.id,
      to_user: incoming.peer,
      kind: "decline",
    });
    setIncoming(null);
  };

  return (
    <>
      <Dialog open={!!incoming} onOpenChange={(o) => { if (!o) decline(); }}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
              <Avatar className="h-24 w-24 relative ring-4 ring-primary">
                <AvatarImage src={incoming?.peerAvatar ?? undefined} />
                <AvatarFallback className="text-2xl bg-brand-gradient text-primary-foreground">
                  {(incoming?.peerName || "?").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <p className="text-lg font-bold">{incoming?.peerName}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                {incoming?.kind === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                مكالمة {incoming?.kind === "video" ? "فيديو" : "صوتية"} واردة...
              </p>
            </div>
            <div className="flex gap-6 mt-2">
              <Button size="icon" variant="destructive" className="h-14 w-14 rounded-full" onClick={decline}>
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700" onClick={accept}>
                <Phone className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {inCall && (
        <CallModal
          conversationId={inCall.conversationId}
          peerId={inCall.peer}
          peerName={inCall.peerName}
          kind={inCall.kind}
          initiator={false}
          initialOffer={inCall.payload}
          onClose={() => setInCall(null)}
        />
      )}
    </>
  );
}
