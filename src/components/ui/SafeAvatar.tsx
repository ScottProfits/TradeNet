"use client";
import { useState } from "react";

interface SafeAvatarProps {
  src?: string | null;
  alt: string;
  initials: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SafeAvatar({ src, alt, initials, className = "w-9 h-9", style }: SafeAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`${className} rounded-full object-cover shrink-0`}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`${className} rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0`} style={style}>
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
