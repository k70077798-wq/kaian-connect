import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LiveKitStage } from "@/components/LiveKitStage";

type Props = {
  conversationId: string;
  peerId: string;
  peerName: string;
  kind: "audio" | "video";
  initiator: boolean;
  initialOffer?: any;
  onClose: () => void;
};

/**
 * LiveKit-powered 1:1 call. On initiate, we drop a "ring" signal in call_signals
 * so the peer's global listener can open its own CallModal into the same room.
 * Both sides connect to room `call-<conversationId>` and publish mic (+ camera for video).
 */
export function CallModal({ conversationId, peerId, peerName, kind, initiator, onClose }: Props) {
  const { user } = useAuth();
  const room = `call-${conversationId}`;
  const startedAt = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const sentHangup = useRef(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      if (initiator) {
        await supabase.from("call_signals").insert({
          conversation_id: conversationId,
          from_user: user.id,
          to_user: peerId,
          kind: "offer",
          payload: { room, video: kind === "video" },
        });
      }
      if (mounted) { setReady(true); startedAt.current = Date.now(); }
    })();

    // Listen for hangup / decline from peer
    const ch = supabase
      .channel(`call-hangup-${conversationId}-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        (p) => {
          const s: any = p.new;
          if (s.conversation_id !== conversationId) return;
          if (s.from_user !== peerId) return;
          if (s.kind === "hangup" || s.kind === "decline") end();
        }).subscribe();

    const end = async () => {
      if (!mounted) return;
      mounted = false;
      const dur = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
      if (!sentHangup.current) {
        sentHangup.current = true;
        try {
          await supabase.from("call_signals").insert({
            conversation_id: conversationId,
            from_user: user.id, to_user: peerId, kind: "hangup",
          });
        } catch {}
      }
      if (initiator) {
        supabase.from("messages").insert({
          conversation_id: conversationId, sender_id: user.id,
          call_kind: kind, call_status: dur > 3 ? "ended" : "missed", call_duration: dur,
          content: dur > 3 ? `مكالمة ${kind === "video" ? "فيديو" : "صوتية"} - ${dur}s` : "مكالمة فائتة",
        });
      }
      supabase.removeChannel(ch);
      onClose();
    };

    (window as any).__hangup = end;
    return () => { end(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {ready && user && (
        <LiveKitStage
          room={room}
          identity={user.id}
          name={peerName}
          mode="call"
          video={kind === "video"}
          audio
          onEnded={() => (window as any).__hangup?.()}
        />
      )}
      <div className="absolute top-6 right-6 z-20 text-white text-sm">
        <p className="opacity-80">مكالمة {kind === "video" ? "فيديو" : "صوتية"}</p>
        <p className="font-bold">{peerName}</p>
      </div>
    </div>
  );
}
