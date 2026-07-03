import { useEffect, useRef } from "react";

interface Props {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  poster?: string;
}

/**
 * HLS (.m3u8) player — client-only.
 * Uses native HLS when supported (Safari/iOS), otherwise dynamically loads hls.js.
 */
export function HlsPlayer({ src, autoPlay = true, muted = true, controls = true, className, poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    let hls: any = null;
    let cancelled = false;

    const isM3u8 = /\.m3u8($|\?)/i.test(src);

    if (!isM3u8) {
      video.src = src;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    (async () => {
      try {
        const mod = await import("hls.js");
        if (cancelled) return;
        const Hls = mod.default;
        if (Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(src);
          hls.attachMedia(video);
        } else {
          video.src = src;
        }
      } catch {
        video.src = src;
      }
    })();

    return () => {
      cancelled = true;
      if (hls) { try { hls.destroy(); } catch { /* noop */ } }
    };
  }, [src]);

  return (
    <video
      ref={ref}
      autoPlay={autoPlay}
      muted={muted}
      controls={controls}
      playsInline
      poster={poster}
      className={className}
    />
  );
}
