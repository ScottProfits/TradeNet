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
export default function VoiceNote({ src, duration = 0 }: { src: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(duration);
  const wave = useMemo(() => bars(src, 34), [src]);

  useEffect(() => {
    const a = new Audio(src);
    a.preload = "metadata";
    audioRef.current = a;
    const onTime = () => setCur(a.currentTime);
    const setIfReal = () => { if (a.duration && isFinite(a.duration) && a.duration > 0) setTotal(a.duration); };
    const onMeta = () => {
      // MediaRecorder webm/opus files often report duration Infinity until the
      // playhead is forced to the end — nudge it, then reset.
      if (!isFinite(a.duration) || a.duration === 0) {
        const fix = () => {
          setIfReal();
          a.currentTime = 0;
          a.removeEventListener("timeupdate", fix);
        };
        a.addEventListener("timeupdate", fix);
        try { a.currentTime = 1e7; } catch { /* ignore */ }
      } else {
        setIfReal();
      }
    };
    const onEnd = () => { setPlaying(false); setCur(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", setIfReal);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", setIfReal);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function seekTo(clientX: number, el: HTMLElement) {
    const a = audioRef.current;
    const dur = total || duration;
    if (!a || !dur) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = pct * dur;
    setCur(a.currentTime);
  }

  const eff = total || duration || 0;
  const progress = eff ? Math.min(1, cur / eff) : 0;

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

      <span className="shrink-0 text-[10px] text-gray-500 tabular-nums">{clock(playing || cur ? cur : eff)}</span>
    </div>
  );
}
