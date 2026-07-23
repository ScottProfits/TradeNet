"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ExpandableVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

export default function ExpandableVideo({ src, poster, className }: ExpandableVideoProps) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // iOS WebKit sometimes ignores the declarative autoplay attribute (e.g. after
    // the element is re-covered by an overlay) — force it via the play() API,
    // which is always permitted for muted video regardless of gesture state.
    videoRef.current?.play().catch(() => {});
  }, [src]);

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

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
