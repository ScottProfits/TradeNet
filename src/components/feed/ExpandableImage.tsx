"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface ExpandableImageProps {
  src: string;
  alt: string;
  /** Pass "h-full" when used inside a fixed-aspect grid cell (e.g. a multi-image gallery) so the thumbnail fills it instead of the default capped height. */
  thumbnailClassName?: string;
}

export default function ExpandableImage({ src, alt, thumbnailClassName }: ExpandableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={clsx("block w-full cursor-zoom-in", thumbnailClassName ? "h-full" : undefined)}>
        <Image src={src} alt={alt} width={600} height={300} className={clsx("w-full object-cover", thumbnailClassName ?? "max-h-80")} />
      </button>

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-[92vw] h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
