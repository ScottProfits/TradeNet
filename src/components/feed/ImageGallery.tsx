"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(openIndex !== null);

  function goTo(i: number) {
    setOpenIndex(Math.max(0, Math.min(images.length - 1, i)));
  }

  function onTouchStart(e: React.TouchEvent) {
    draggingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    deltaXRef.current = 0;
    if (trackRef.current) trackRef.current.style.transition = "none";
  }

  // translateX percentages resolve against the track's own width (which is
  // images.length * 100% of the container), not the container itself — so
  // shifting by "one photo" is (100 / images.length)% of the track, not 100%.
  // Using a flat 100% here was overshooting by a factor of images.length,
  // which is why one swipe blew past multiple photos.
  function slidePercent(index: number) {
    return (index * 100) / images.length;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current || openIndex === null) return;
    let delta = e.touches[0].clientX - startXRef.current;
    // Block dragging past the first/last photo entirely — otherwise the
    // track slides past its own edge and reveals blank space beyond it.
    if (openIndex === 0 && delta > 0) delta = 0;
    if (openIndex === images.length - 1 && delta < 0) delta = 0;
    deltaXRef.current = delta;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(${-slidePercent(openIndex)}% + ${delta}px))`;
    }
  }

  function onTouchEnd() {
    if (!draggingRef.current || openIndex === null) return;
    draggingRef.current = false;
    if (trackRef.current) trackRef.current.style.transition = "transform 250ms ease-out";
    const threshold = 50;
    if (deltaXRef.current < -threshold) goTo(openIndex + 1);
    else if (deltaXRef.current > threshold) goTo(openIndex - 1);
    else if (trackRef.current) trackRef.current.style.transform = `translateX(-${slidePercent(openIndex)}%)`;
    deltaXRef.current = 0;
  }

  return (
    <>
      <div className={clsx("grid gap-1 rounded-lg overflow-hidden border border-[var(--border)]", images.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="aspect-square cursor-zoom-in"
          >
            <Image src={src} alt={`Post media ${i + 1}`} width={300} height={300} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black touch-none overflow-hidden"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            style={{ top: "max(1rem, env(safe-area-inset-top))", right: "1rem" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <div
              className="absolute z-10 flex items-center justify-center gap-1.5"
              style={{ top: "max(1rem, env(safe-area-inset-top))", left: "1rem" }}
            >
              <span className="text-xs text-white/80 bg-black/60 rounded-full px-2.5 py-1">
                {openIndex + 1} / {images.length}
              </span>
            </div>
          )}

          <div
            ref={trackRef}
            className="flex h-full"
            style={{ transform: `translateX(-${slidePercent(openIndex)}%)`, width: `${images.length * 100}%` }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            {images.map((src, i) => (
              <div key={i} className="flex items-center justify-center h-full shrink-0" style={{ width: `${100 / images.length}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Post media ${i + 1}`}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <div
              className="absolute inset-x-0 z-10 flex items-center justify-center gap-1.5"
              style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goTo(i); }}
                  aria-label={`Go to photo ${i + 1}`}
                  className={clsx("w-1.5 h-1.5 rounded-full transition-colors", i === openIndex ? "bg-white" : "bg-white/35")}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
