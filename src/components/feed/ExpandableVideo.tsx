"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ExpandableVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

export default function ExpandableVideo({ src, poster, className }: ExpandableVideoProps) {
  const [open, setOpen] = useState(false);
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
    if (open) expandedVideoRef.current?.play().catch(() => {});
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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            background: "radial-gradient(ellipse 90% 70% at 50% 42%, rgba(20,32,28,1) 0%, rgba(6,10,9,1) 60%, rgba(0,0,0,1) 100%)",
          }}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
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
            className="w-[92vw] h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              const v = expandedVideoRef.current;
              if (!v) return;
              if (v.paused) v.play().catch(() => {}); else v.pause();
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
