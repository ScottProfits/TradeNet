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
  const [objectFit, setObjectFit] = useState<"cover" | "contain">("contain");
  const draggingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  function seekFromClientX(clientX: number) {
    const track = trackRef.current;
    const v = expandedVideoRef.current;
    if (!track || !v || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const time = ratio * duration;
    v.currentTime = time;
    setCurrentTime(time);
  }

  useEffect(() => {
    // Backup for the onPointer* handlers below: Pointer Events aren't
    // reliably cancelable in every WKWebView build Capacitor ships on, so a
    // manual non-passive touch listener (React's synthetic touch handlers
    // are passive by default and can't call preventDefault) gives a second,
    // more direct path to stop the native drag from reaching the scroll view.
    const track = trackRef.current;
    if (!open || !track) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      seekFromClientX(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      seekFromClientX(e.touches[0].clientX);
    };
    const onTouchEnd = () => { draggingRef.current = false; };

    track.addEventListener("touchstart", onTouchStart, { passive: false });
    track.addEventListener("touchmove", onTouchMove, { passive: false });
    track.addEventListener("touchend", onTouchEnd);
    track.addEventListener("touchcancel", onTouchEnd);
    return () => {
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchmove", onTouchMove);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [open, duration]);

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

  useEffect(() => {
    // overflow:hidden alone doesn't stop it — the body is still part of the
    // scrollable document, so iOS WKWebView can still rubber-band it (and a
    // fixed-position overlay visibly lags/shifts along with that native
    // scroll). Actually pinning the body out of the document flow via
    // position:fixed removes it from scroll contention entirely, which is
    // the only fix that has reliably stopped this class of iOS bug.
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body.style;
    const prev = { position: body.position, top: body.top, left: body.left, right: body.right, width: body.width };
    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.left = "0";
    body.right = "0";
    body.width = "100%";

    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      body.position = prev.position;
      body.top = prev.top;
      body.left = prev.left;
      body.right = prev.right;
      body.width = prev.width;
      window.scrollTo(0, scrollY);
      document.removeEventListener("touchmove", preventScroll);
    };
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
        <div className="fixed inset-0 z-[100] bg-black touch-none">
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
            className={`absolute inset-0 w-full h-full object-${objectFit}`}
            onClick={() => {
              const v = expandedVideoRef.current;
              if (!v) return;
              if (v.paused) v.play().catch(() => {});
              else v.pause();
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setDuration(v.duration);
              // Fill the screen edge-to-edge when the video's aspect ratio is
              // close to the viewport's (crop is barely noticeable); otherwise
              // letterbox so wide/tall videos aren't zoomed in and cropped.
              const videoAspect = v.videoWidth / v.videoHeight;
              const viewportAspect = window.innerWidth / window.innerHeight;
              const ratio = videoAspect / viewportAspect;
              setObjectFit(ratio > 0.75 && ratio < 1.33 ? "cover" : "contain");
            }}
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
            <div
              ref={trackRef}
              className="relative flex-1 h-5 flex items-center touch-none"
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                draggingRef.current = true;
                seekFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (!draggingRef.current) return;
                e.preventDefault();
                seekFromClientX(e.clientX);
              }}
              onPointerUp={() => { draggingRef.current = false; }}
              onPointerCancel={() => { draggingRef.current = false; }}
            >
              <div className="w-full h-1 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div
                className="absolute w-3 h-3 rounded-full bg-white -translate-x-1/2 shadow"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-white/80 tabular-nums shrink-0 w-9">{formatTime(duration)}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
