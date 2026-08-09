"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Play, Pause } from "lucide-react";

interface ExpandableVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ExpandableVideo({ src, poster, className }: ExpandableVideoProps) {
  const [open, setOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // iOS WebKit sometimes ignores the declarative autoplay attribute (e.g. after
    // the element is re-covered by an overlay) — force it via the play() API,
    // which is always permitted for muted video regardless of gesture state.
    videoRef.current?.play().catch(() => {});
  }, [src]);

  useEffect(() => {
    // Same as above, for the expanded (unmuted) lightbox video - this is
    // still tied to the user's tap that set `open`, so browsers allow it.
    if (open) {
      setIsPlaying(true);
      expandedVideoRef.current?.play().catch(() => {});
    }
  }, [open]);

  return (
    <>
      <div className="relative w-full cursor-zoom-in">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className={className ?? "w-full max-h-80 object-cover"}
          style={{ pointerEvents: "none" }}
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Transparent tap-catcher: iOS WebKit toggles play/pause on a tapped
            <video> at a level below normal DOM z-stacking, so pointer-events:none
            above alone isn't reliably enough — this sibling is the actual tap target. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 w-full h-full"
          aria-label="Expand video"
        />
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] bg-black">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            style={{ top: "max(1rem, env(safe-area-inset-top))", right: "1rem" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <video
            ref={expandedVideoRef}
            src={src}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onClick={() => {
              const v = expandedVideoRef.current;
              if (!v) return;
              if (v.paused) v.play().catch(() => {});
              else v.pause();
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />

          {/* Bottom playback bar */}
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 px-4 py-3"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const v = expandedVideoRef.current;
                if (!v) return;
                if (v.paused) v.play().catch(() => {});
                else v.pause();
              }}
              className="flex items-center justify-center w-8 h-8 shrink-0 text-white"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>
            <span className="text-xs text-white/80 tabular-nums shrink-0 w-9">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => {
                const v = expandedVideoRef.current;
                if (!v) return;
                v.currentTime = Number(e.target.value);
                setCurrentTime(Number(e.target.value));
              }}
              className="flex-1 accent-white h-1"
              aria-label="Seek"
            />
            <span className="text-xs text-white/80 tabular-nums shrink-0 w-9">{formatTime(duration)}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
