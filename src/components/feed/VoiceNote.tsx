"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function clock(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// Stable pseudo-random bar heights so each clip has its own "waveform".
function bars(src: string, n: number) {
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(0.28 + ((h >>> 8) % 100) / 100 * 0.72);
  }
  return out;
}

// Compact voice-note player — waveform scrubber, tiny controls.
// MediaRecorder webm files report duration Infinity, so we treat the saved
// `duration` (seconds) as the source of truth for length + end-of-clip.
export default function VoiceNote({ src, duration = 0 }: { src: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [metaDur, setMetaDur] = useState(0);
  const wave = useMemo(() => bars(src, 34), [src]);

  // Best known length: a finite value from the file, else the saved seconds.
  const total = (metaDur > 0 ? metaDur : 0) || (duration > 0 ? duration : 0);
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    const a = new Audio(src);
    a.preload = "metadata";
    audioRef.current = a;

    const reset = () => { a.pause(); a.currentTime = 0; setCur(0); setPlaying(false); };
    const onTime = () => {
      const t = a.currentTime;
      setCur(t);
      const dur = totalRef.current;
      // webm with a broken duration never fires "ended" — stop it ourselves.
      if (dur > 0 && t >= dur - 0.05) reset();
      else if (dur === 0 && t > 60) reset();
    };
    const onMeta = () => { if (a.duration && isFinite(a.duration) && a.duration > 0) setMetaDur(a.duration); };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", reset);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", reset);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    if (total > 0 && a.currentTime >= total - 0.05) a.currentTime = 0;
    a.play().then(() => setPlaying(true)).catch(() => {});
  }

  function seekTo(clientX: number, el: HTMLElement) {
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = pct * total;
    setCur(a.currentTime);
  }

  const progress = total ? Math.min(1, cur / total) : 0;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.07] pl-1 pr-2.5 py-1 max-w-[210px]">
      <button
        onClick={toggle}
        className="shrink-0 w-6 h-6 rounded-full bg-[var(--green)] text-black flex items-center justify-center"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current translate-x-[0.5px]" />}
      </button>

      <div
        className="flex items-center gap-[2px] h-5 flex-1 cursor-pointer"
        onClick={(e) => seekTo(e.clientX, e.currentTarget)}
      >
        {wave.map((v, i) => {
          const on = i / wave.length <= progress;
          return (
            <span
              key={i}
              className="w-[2px] rounded-full transition-colors"
              style={{
                height: `${Math.round(v * 100)}%`,
                background: on ? "var(--green)" : "rgba(255,255,255,0.22)",
              }}
            />
          );
        })}
      </div>

      <span className="shrink-0 text-[10px] text-gray-500 tabular-nums">{clock(playing || cur ? cur : total)}</span>
    </div>
  );
}
