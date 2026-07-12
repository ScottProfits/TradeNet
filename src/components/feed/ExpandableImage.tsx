"use client";
import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";

interface ExpandableImageProps {
  src: string;
  alt: string;
}

export default function ExpandableImage({ src, alt }: ExpandableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative block w-full cursor-zoom-in">
        <Image src={src} alt={alt} width={600} height={300} className="w-full max-h-80 object-cover" unoptimized />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-full">
          <Maximize2 className="w-3 h-3" /> Tap to view full
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
