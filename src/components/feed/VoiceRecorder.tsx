"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import VoiceNote from "@/components/feed/VoiceNote";
import { pickMime, voiceRecordingSupported, micErrorMessage, VOICE_MAX_SECONDS } from "@/lib/voice";

export interface VoiceClip {
  blob: Blob;
  url: string;
  seconds: number;
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Self-contained "add a voice note" control: idle → record → preview.
// The parent owns the resulting clip and uploads it on submit.
export default function VoiceRecorder({
  clip,
  onChange,
  label = "Add a voice note",
}: {
  clip: VoiceClip | null;
  onChange: (clip: VoiceClip | null) => void;
  label?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError("");
    if (!voiceRecordingSupported()) {
      setError("Voice recording works in the Safari browser — open ryzr.app in Safari. (Coming to the app in the next update.)");
      return;
    }
    if (clip) { URL.revokeObjectURL(clip.url); onChange(null); }
    try {
      if (!streamRef.current || !streamRef.current.getAudioTracks().some((t) => t.readyState === "live")) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const mime = pickMime();
      const mr = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        if (tickRef.current) clearInterval(tickRef.current);
        setRecording(false);
        const seconds = Math.min(VOICE_MAX_SECONDS, Math.max(1, Math.round((Date.now() - startedRef.current) / 1000)));
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        onChange({ blob, url: URL.createObjectURL(blob), seconds });
      };
      mediaRef.current = mr;
      startedRef.current = Date.now();
      setElapsed(0);
      mr.start();
      setRecording(true);
      tickRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startedRef.current) / 1000);
        setElapsed(s);
        if (s >= VOICE_MAX_SECONDS) stop();
      }, 200);
    } catch (err) {
      setError(micErrorMessage(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, onChange, stop]);

  const clear = useCallback(() => {
    stop();
    if (clip) URL.revokeObjectURL(clip.url);
    onChange(null);
    setElapsed(0);
    releaseStream();
  }, [clip, onChange, stop, releaseStream]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}

      {recording ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[var(--red)]/40 bg-[var(--red)]/5 px-3 py-1.5">
            <Mic className="w-3.5 h-3.5 text-[var(--red)] animate-pulse" />
            <span className="text-[13px] text-white tabular-nums">{fmt(elapsed)}</span>
            <span className="text-[11px] text-gray-600">/ 0:25</span>
          </div>
          <button type="button" onClick={clear} className="text-xs text-gray-500 hover:text-white">Cancel</button>
          <button
            type="button"
            onClick={stop}
            className="ml-auto shrink-0 w-9 h-9 rounded-full bg-[var(--red)] text-white flex items-center justify-center"
            aria-label="Stop recording"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      ) : clip ? (
        <div className="flex items-center gap-2">
          <VoiceNote src={clip.url} duration={clip.seconds} />
          <button type="button" onClick={clear} className="p-1.5 text-gray-500 hover:text-[var(--red)]" aria-label="Remove voice note">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[13px] text-gray-400 hover:text-white hover:border-[var(--green)]/40 transition-colors"
        >
          <Mic className="w-4 h-4" /> {label} <span className="text-gray-600">· 25s</span>
        </button>
      )}
    </div>
  );
}
