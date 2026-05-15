import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

type Props = {
  conversationId: string;
  peerId: string;
  peerName: string;
  kind: "audio" | "video";
  initiator: boolean;
  onClose: () => void;
};

export function CallModal({ conversationId, peerId, peerName, kind, initiator, onClose }: Props) {
  const { user } = useAuth();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState(initiator ? "جاري الاتصال…" : "اتصال وارد…");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const send = async (k: string, payload: any = null) => {
      await supabase.from("call_signals").insert({
        conversation_id: conversationId, from_user: user.id, to_user: peerId, kind: k, payload,
      });
    };

    const setup = async () => {
      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
      localStreamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
        setStatus("متصل");
        startedAt.current = Date.now();
      };
      pc.onicecandidate = (e) => { if (e.candidate) send("ice", e.candidate.toJSON()); };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await send("offer", { sdp: offer.sdp, type: offer.type });
      }
    };

    const ch = supabase
      .channel(`call-${conversationId}-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        async (p) => {
          const sig: any = p.new;
          if (sig.conversation_id !== conversationId || sig.from_user !== peerId) return;
          const pc = pcRef.current;
          if (!pc) return;
          if (sig.kind === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await send("answer", { sdp: ans.sdp, type: ans.type });
          } else if (sig.kind === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          } else if (sig.kind === "ice") {
            try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload)); } catch {}
          } else if (sig.kind === "hangup" || sig.kind === "decline") {
            cleanup();
          }
        })
      .subscribe();

    setup().catch((e) => { console.error(e); setStatus("تعذّر فتح الكاميرا/المايك"); });

    const cleanup = () => {
      if (!mounted) return;
      mounted = false;
      const dur = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      supabase.removeChannel(ch);
      // log call message
      if (initiator) {
        supabase.from("messages").insert({
          conversation_id: conversationId, sender_id: user.id,
          call_kind: kind, call_status: dur ? "ended" : "missed", call_duration: dur,
          content: dur ? `مكالمة ${kind === "video" ? "فيديو" : "صوتية"} - ${dur}s` : `مكالمة فائتة`,
        });
      }
      onClose();
    };

    (window as any).__hangup = async () => { await send("hangup"); cleanup(); };

    return () => { (async () => { try { await send("hangup"); } catch {} cleanup(); })(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  };
  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOff(!t.enabled); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      <div className="flex-1 relative grid place-items-center">
        {kind === "video" ? (
          <>
            <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <video ref={localRef} autoPlay playsInline muted className="absolute bottom-24 left-4 w-32 h-44 rounded-xl object-cover border-2 border-white/40 shadow-xl" />
          </>
        ) : (
          <div className="text-center text-white">
            <div className="mx-auto h-32 w-32 rounded-full bg-brand-gradient grid place-items-center text-5xl font-black">{peerName.charAt(0)}</div>
            <h2 className="mt-6 text-2xl font-bold">{peerName}</h2>
            <audio ref={remoteRef as any} autoPlay />
          </div>
        )}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/90 text-sm bg-black/40 backdrop-blur px-3 py-1 rounded-full">
          {status}
        </div>
      </div>
      <div className="p-6 flex items-center justify-center gap-4 bg-black/60">
        <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" onClick={toggleMute}>
          {muted ? <MicOff /> : <Mic />}
        </Button>
        {kind === "video" && (
          <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" onClick={toggleCam}>
            {camOff ? <VideoOff /> : <VideoIcon />}
          </Button>
        )}
        <Button size="icon" variant="destructive" className="h-14 w-14 rounded-full" onClick={() => (window as any).__hangup?.()}>
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}
