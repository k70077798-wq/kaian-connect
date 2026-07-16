import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, createLocalTracks, ConnectionState } from "livekit-client";
import type { LocalTrack, RemoteTrack, RemoteParticipant, RemoteTrackPublication, Participant } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Radio, Users, Circle, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLivekitToken } from "@/lib/livekit.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
 * Includes viewers panel, connection status with auto-reconnect indicator,
 * and optional client-side recording (broadcaster only).
 */
export function LiveKitStage({
  room: roomName, identity, name, mode,
  video = true, audio = true, onEnded, className, autoJoin = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const [status, setStatus] = useState<string>(mode === "viewer" ? "جارِ الاتصال بالبث..." : "جارِ الاتصال...");
  const [connState, setConnState] = useState<"connecting" | "connected" | "reconnecting" | "disconnected">("connecting");
  const [muted, setMuted] = useState(!audio);
  const [camOff, setCamOff] = useState(!video);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [recording, setRecording] = useState(false);
  const [savingRec, setSavingRec] = useState(false);
  const getToken = useServerFn(getLivekitToken);

  useEffect(() => {
    if (!autoJoin) return;
    let cancelled = false;

    const refreshParticipants = (rm: Room) => {
      const list: { id: string; name: string }[] = [];
      list.push({ id: rm.localParticipant.identity, name: rm.localParticipant.name || "أنت" });
      rm.remoteParticipants.forEach((p) => list.push({ id: p.identity, name: p.name || p.identity }));
      setParticipants(list);
    };

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
    const detach = (track: Track) => { track.detach().forEach((el) => el.remove()); };

    const run = async () => {
      try {
        const canPublish = mode !== "viewer";
        const { token, url } = await getToken({ data: { room: roomName, identity, name, canPublish } });
        if (cancelled) return;

        const rm = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = rm;

        rm.on(RoomEvent.TrackSubscribed, (t: RemoteTrack, _p: RemoteTrackPublication, pp: RemoteParticipant) => attach(t, pp.identity));
        rm.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => detach(t));
        rm.on(RoomEvent.ParticipantConnected, () => refreshParticipants(rm));
        rm.on(RoomEvent.ParticipantDisconnected, () => {
          refreshParticipants(rm);
          if (mode === "call" && rm.numParticipants <= 1) { toast.info("انتهت المكالمة"); onEnded?.(); }
        });
        rm.on(RoomEvent.Reconnecting, () => { setConnState("reconnecting"); setStatus("إعادة الاتصال..."); });
        rm.on(RoomEvent.Reconnected, () => {
          setConnState("connected");
          setStatus(mode === "viewer" ? "متصل بالبث" : mode === "call" ? "متصل" : "🔴 مباشر");
          toast.success("تمت إعادة الاتصال");
        });
        rm.on(RoomEvent.Disconnected, () => { setConnState("disconnected"); onEnded?.(); });
        rm.on(RoomEvent.ConnectionStateChanged, (s) => {
          if (s === ConnectionState.Connected) setConnState("connected");
        });

        await rm.connect(url, token);
        setConnState("connected");
        refreshParticipants(rm);
        setStatus(mode === "viewer" ? "متصل بالبث" : mode === "call" ? "متصل" : "🔴 مباشر");

        if (canPublish) {
          const tracks = await createLocalTracks({
            audio,
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
        setConnState("disconnected");
        onEnded?.();
      }
    };

    run();
    return () => {
      cancelled = true;
      try { recorderRef.current?.stop(); } catch {}
      localTracksRef.current.forEach((t) => { try { t.stop(); } catch {} });
      localTracksRef.current = [];
      roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity, mode, autoJoin]);

  const toggleMute = () => {
    const rm = roomRef.current; if (!rm) return;
    const next = !muted; rm.localParticipant.setMicrophoneEnabled(!next); setMuted(next);
  };
  const toggleCam = () => {
    const rm = roomRef.current; if (!rm) return;
    const next = !camOff; rm.localParticipant.setCameraEnabled(!next); setCamOff(next);
  };

  const startRecording = () => {
    const tracks = localTracksRef.current;
    if (!tracks.length) return toast.error("لا توجد مسارات للتسجيل");
    try {
      const mediaStream = new MediaStream();
      tracks.forEach((t) => { if (t.mediaStreamTrack) mediaStream.addTrack(t.mediaStreamTrack); });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const rec = new MediaRecorder(mediaStream, { mimeType: mime });
      recordedChunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      rec.onstop = async () => {
        setSavingRec(true);
        try {
          const blob = new Blob(recordedChunks.current, { type: mime });
          const path = `recordings/${identity}/${Date.now()}.webm`;
          const { error: upErr } = await supabase.storage.from("media").upload(path, blob, {
            contentType: mime, upsert: false,
          });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
          try {
            await supabase.from("posts").insert({
              user_id: identity,
              content: "🎥 تسجيل بث مباشر",
              video_url: pub.publicUrl,
              media_type: "video",
            });
          } catch {}
          toast.success("تم حفظ التسجيل");
        } catch (e: any) {
          toast.error(e?.message || "تعذر حفظ التسجيل");
        } finally { setSavingRec(false); }
      };
      rec.start(1000);
      recorderRef.current = rec;
      setRecording(true);
      toast.success("بدأ التسجيل");
    } catch (e: any) {
      toast.error(e?.message || "المتصفح لا يدعم التسجيل");
    }
  };
  const stopRecording = () => {
    try { recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    setRecording(false);
  };

  const canPublish = mode !== "viewer";
  const viewerCount = Math.max(0, participants.length - 1);

  return (
    <div className={`relative w-full h-full bg-black text-white ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Status pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur text-xs">
        {mode === "broadcaster" && connState === "connected" && <Radio className="h-3 w-3 text-red-500 animate-pulse" />}
        {connState === "reconnecting" && <Loader2 className="h-3 w-3 animate-spin" />}
        <span>{status}</span>
        {connState === "connected" && mode !== "call" && <span className="opacity-80">• {viewerCount} مشاهد</span>}
      </div>

      {/* Viewers panel (broadcaster/viewer only) */}
      {mode !== "call" && (
        <div className="absolute top-3 right-3 z-20">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary" className="h-9 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 text-white gap-1.5">
                <Users className="h-4 w-4" />{participants.length}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle>المشاهدون ({participants.length})</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                    <Avatar className="h-9 w-9"><AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs">{(p.name || "?").slice(0,1)}</AvatarFallback></Avatar>
                    <span className="text-sm">{p.name}</span>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {canPublish && (
          <>
            <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={toggleMute} title={muted ? "تشغيل الميكروفون" : "كتم"}>
              {muted ? <MicOff /> : <Mic />}
            </Button>
            {video && (
              <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={toggleCam} title={camOff ? "تشغيل الكاميرا" : "إيقاف الكاميرا"}>
                {camOff ? <VideoOff /> : <VideoIcon />}
              </Button>
            )}
            {mode === "broadcaster" && (
              <Button
                size="icon"
                variant={recording ? "destructive" : "secondary"}
                className="h-12 w-12 rounded-full"
                onClick={recording ? stopRecording : startRecording}
                disabled={savingRec}
                title={recording ? "إيقاف التسجيل" : "بدء التسجيل"}
              >
                {savingRec ? <Loader2 className="animate-spin" /> : recording ? <Square /> : <Circle className="text-red-500 fill-current" />}
              </Button>
            )}
          </>
        )}
        <Button size="icon" variant="destructive" className="h-12 w-12 rounded-full" onClick={onEnded} title={mode === "broadcaster" ? "إنهاء البث" : "إنهاء"}>
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}
