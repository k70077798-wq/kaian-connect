import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, createLocalTracks } from "livekit-client";
import type { LocalTrack, RemoteTrack, RemoteParticipant, RemoteTrackPublication } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Radio } from "lucide-react";
import { toast } from "sonner";
import { getLivekitToken } from "@/lib/livekit.functions";
import { useServerFn } from "@tanstack/react-start";

interface Props {
  room: string;
  identity: string;
  name?: string;
  mode: "broadcaster" | "viewer" | "call";
  video?: boolean;
  audio?: boolean;
  onEnded?: () => void;
  className?: string;
  autoJoin?: boolean;
}

/**
 * Unified LiveKit stage for live streams (broadcaster/viewer) and 1:1 calls.
 */
export function LiveKitStage({
  room: roomName, identity, name, mode,
  video = true, audio = true, onEnded, className, autoJoin = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const [status, setStatus] = useState<string>(mode === "viewer" ? "جارِ الاتصال بالبث..." : "جارِ الاتصال...");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(!audio);
  const [camOff, setCamOff] = useState(!video);
  const [viewers, setViewers] = useState(0);
  const getToken = useServerFn(getLivekitToken);

  useEffect(() => {
    if (!autoJoin) return;
    let cancelled = false;

    const attach = (track: Track, participantId: string) => {
      if (!containerRef.current) return;
      const existing = containerRef.current.querySelector<HTMLElement>(`[data-track="${track.sid}"]`);
      if (existing) return;
      const el = track.attach();
      el.setAttribute("data-track", track.sid || "");
      el.setAttribute("data-participant", participantId);
      el.setAttribute("playsinline", "true");
      if (track.kind === Track.Kind.Video) {
        (el as HTMLVideoElement).className = "w-full h-full object-cover bg-black";
        containerRef.current.appendChild(el);
      } else if (track.kind === Track.Kind.Audio) {
        (el as HTMLAudioElement).autoplay = true;
        containerRef.current.appendChild(el);
      }
    };

    const detach = (track: Track) => {
      track.detach().forEach((el) => el.remove());
    };

    const run = async () => {
      try {
        const canPublish = mode !== "viewer";
        const { token, url } = await getToken({
          data: { room: roomName, identity, name, canPublish },
        });
        if (cancelled) return;

        const rm = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = rm;

        rm.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) => {
          attach(track, p.identity);
        });
        rm.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => detach(track));
        rm.on(RoomEvent.ParticipantConnected, () => setViewers(rm.numParticipants));
        rm.on(RoomEvent.ParticipantDisconnected, () => {
          setViewers(rm.numParticipants);
          if (mode === "call" && rm.numParticipants <= 1) {
            toast.info("انتهت المكالمة");
            onEnded?.();
          }
        });
        rm.on(RoomEvent.Disconnected, () => { setConnected(false); onEnded?.(); });

        await rm.connect(url, token);
        setConnected(true);
        setViewers(rm.numParticipants);
        setStatus(mode === "viewer" ? "متصل بالبث" : mode === "call" ? "متصل" : "🔴 مباشر");

        if (canPublish) {
          const tracks = await createLocalTracks({
            audio: audio,
            video: video ? { facingMode: "user" } : false,
          });
          localTracksRef.current = tracks;
          for (const t of tracks) {
            await rm.localParticipant.publishTrack(t);
            if (t.kind === Track.Kind.Video && containerRef.current) {
              const el = t.attach();
              el.setAttribute("data-track", t.sid || "local-video");
              el.setAttribute("data-local", "1");
              (el as HTMLVideoElement).muted = true;
              (el as HTMLVideoElement).className =
                mode === "call"
                  ? "absolute bottom-24 left-4 w-28 h-40 rounded-xl object-cover border-2 border-white/40 shadow-xl z-10"
                  : "w-full h-full object-cover bg-black";
              containerRef.current.appendChild(el);
            }
          }
        }
      } catch (err: any) {
        console.error("LiveKit error", err);
        toast.error(err?.message || "تعذر الاتصال بخادم البث");
        setStatus("تعذر الاتصال");
        onEnded?.();
      }
    };

    run();
    return () => {
      cancelled = true;
      localTracksRef.current.forEach((t) => { try { t.stop(); } catch {} });
      localTracksRef.current = [];
      roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity, mode, autoJoin]);

  const toggleMute = () => {
    const rm = roomRef.current;
    if (!rm) return;
    const next = !muted;
    rm.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };
  const toggleCam = () => {
    const rm = roomRef.current;
    if (!rm) return;
    const next = !camOff;
    rm.localParticipant.setCameraEnabled(!next);
    setCamOff(next);
  };

  const canPublish = mode !== "viewer";

  return (
    <div className={`relative w-full h-full bg-black text-white ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur text-xs">
        {mode === "broadcaster" && connected && <Radio className="h-3 w-3 text-red-500 animate-pulse" />}
        <span>{status}</span>
        {connected && mode !== "call" && <span className="opacity-80">• {Math.max(0, viewers - 1)} مشاهد</span>}
      </div>
      {(canPublish || mode === "call") && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {canPublish && (
            <>
              <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={toggleMute}>
                {muted ? <MicOff /> : <Mic />}
              </Button>
              {video && (
                <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={toggleCam}>
                  {camOff ? <VideoOff /> : <VideoIcon />}
                </Button>
              )}
            </>
          )}
          <Button size="icon" variant="destructive" className="h-12 w-12 rounded-full" onClick={onEnded}>
            <PhoneOff />
          </Button>
        </div>
      )}
    </div>
  );
}
