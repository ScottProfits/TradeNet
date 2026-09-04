"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function clock(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// Compact voice-note player — play/pause, scrub bar, elapsed/total time.
export default function VoiceNote({ src, duration = 0 }: { src: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(duration);

  useEffect(() => {
    const a = new Audio(src);
    audioRef.current = a;
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => { if (isFinite(a.duration)) setTotal(a.duration); };
    const onEnd = () => { setPlaying(false); setCur(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * total;
    setCur(a.currentTime);
  }

  const pct = total ? Math.min(100, (cur / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 rounded-full bg-white/[0.05] border border-white/[0.08] px-2.5 py-1.5 max-w-[240px]">
      <button
        onClick={toggle}
        className="shrink-0 w-7 h-7 rounded-full bg-[var(--green)] text-black flex items-center justify-center"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />}
      </button>
      <div onClick={seek} className="flex-1 h-1.5 rounded-full bg-white/15 cursor-pointer overflow-hidden">
        <div className="h-full bg-[var(--green)] rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">{clock(cur || total)}</span>
    </div>
  );
}
