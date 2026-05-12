import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Pause, Play } from "lucide-react";

export interface ViewerStory {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

const IMAGE_DURATION = 5000;

export function StoryViewer({
  stories,
  index,
  onClose,
}: {
  stories: ViewerStory[];
  index: number | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<number>(index ?? 0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  const story = index !== null ? stories[current] : null;
  const isVideo = story?.media_type === "video";

  const next = () => {
    if (!stories.length) return;
    if (current >= stories.length - 1) onClose();
    else setCurrent(c => c + 1);
  };
  const prev = () => setCurrent(c => Math.max(0, c - 1));

  // progress for images via rAF; for videos via timeupdate
  useEffect(() => {
    if (index === null || !story) return;
    setProgress(0);
    elapsedRef.current = 0;
    startedAtRef.current = performance.now();

    if (isVideo) return; // handled by video events

    const tick = (now: number) => {
      if (paused) {
        startedAtRef.current = now - elapsedRef.current;
      } else {
        elapsedRef.current = now - startedAtRef.current;
      }
      const p = Math.min(100, (elapsedRef.current / IMAGE_DURATION) * 100);
      setProgress(p);
      if (p >= 100) {
        next();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, index, paused, isVideo]);

  // keyboard
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") prev(); // RTL
      else if (e.key === "ArrowLeft") next();
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") setPaused(p => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current]);

  // pause/resume video
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    if (paused) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
  }, [paused, isVideo, current]);

  return (
    <Dialog open={index !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-0 [&>button]:hidden">
        {story && (
          <div
            className="relative bg-black select-none"
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            {/* progress bars */}
            <div className="absolute top-2 right-2 left-2 z-20 flex gap-1">
              {stories.map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full bg-white transition-[width] duration-100"
                    style={{ width: i < current ? "100%" : i === current ? `${progress}%` : "0%" }}
                  />
                </div>
              ))}
            </div>

            {/* header */}
            <div className="absolute top-5 right-3 left-3 z-20 mt-3 flex items-center gap-2 text-white">
              <Avatar className="h-9 w-9 ring-2 ring-white/70">
                <AvatarImage src={story.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-gradient text-xs">
                  {(story.profile?.full_name || "K").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-bold drop-shadow flex-1">{story.profile?.full_name || "مستخدم"}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setPaused(p => !p)}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* media */}
            <div className="grid place-items-center min-h-[60vh] max-h-[85vh]">
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={story.media_url}
                  autoPlay
                  playsInline
                  className="max-h-[85vh] w-full object-contain"
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (v.duration) setProgress((v.currentTime / v.duration) * 100);
                  }}
                  onEnded={next}
                />
              ) : (
                <img src={story.media_url} alt="" className="max-h-[85vh] w-full object-contain" />
              )}
            </div>

            {/* nav zones */}
            <button onClick={prev} className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="السابق" />
            <button onClick={next} className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="التالي" />

            <button onClick={prev} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={next} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
              <ChevronLeft className="h-5 w-5" />
            </button>

            {story.caption && (
              <div className="absolute bottom-4 right-4 left-4 z-20 text-white text-center text-sm bg-black/50 backdrop-blur-sm rounded-lg p-2">
                {story.caption}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
