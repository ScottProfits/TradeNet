"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Radio, X, Loader2, Users } from "lucide-react";
import { startBroadcast, watchStream, localDay, type Broadcast } from "@/lib/streamClient";
import { errorMessage } from "@/lib/apiError";

interface LiveStatus {
  live: boolean;
  streamId?: string;
  title?: string | null;
  isBroadcaster?: boolean;
  broadcaster?: { handle: string; avatar_url: string; verified: boolean } | null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function ChannelLive({
  channelId,
  canBroadcast,
}: {
  channelId: string;
  canBroadcast: boolean;
}) {
  const [status, setStatus] = useState<LiveStatus>({ live: false });
  const [starting, setStarting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const broadcastRef = useRef<Broadcast | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerPcRef = useRef<RTCPeerConnection | null>(null);
  const watchingIdRef = useRef<string | null>(null);

  const isDesktop = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/channels/${channelId}/stream`);
      if (!r.ok) return;
      setStatus(await r.json());
    } catch {}
  }, [channelId]);

  // Reset everything when the topic changes.
  useEffect(() => {
    setStatus({ live: false });
    setSecondsLeft(null);
    return () => {
      broadcastRef.current?.stop();
      broadcastRef.current = null;
      viewerPcRef.current?.close();
      viewerPcRef.current = null;
      watchingIdRef.current = null;
    };
  }, [channelId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  // Broadcaster heartbeat.
  useEffect(() => {
    if (!broadcastRef.current) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/channels/${channelId}/stream/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: localDay() }),
        });
        const j = await r.json();
        if (j.ended) endBroadcast(true);
        else if (typeof j.secondsLeft === "number") setSecondsLeft(j.secondsLeft);
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, [status.isBroadcaster, channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viewer: attach the remote stream when one goes live.
  useEffect(() => {
    if (status.isBroadcaster || broadcastRef.current) return;
    if (status.live && status.streamId && watchingIdRef.current !== status.streamId) {
      watchingIdRef.current = status.streamId;
      watchStream(status.streamId)
        .then(({ pc, stream }) => {
          viewerPcRef.current = pc;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          watchingIdRef.current = null;
        });
    }
    if (!status.live && watchingIdRef.current) {
      viewerPcRef.current?.close();
      viewerPcRef.current = null;
      watchingIdRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [status.live, status.streamId, status.isBroadcaster]);

  async function goLive() {
    const title = prompt("Stream title (optional)") ?? undefined;
    const withMic = confirm("Include your microphone? (Cancel = screen audio only)");
    setStarting(true);
    try {
      const b = await startBroadcast(channelId, { title, withMic });
      broadcastRef.current = b;
      if (videoRef.current) {
        videoRef.current.srcObject = b.stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
      await poll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start the stream");
    }
    setStarting(false);
  }

  async function endBroadcast(auto = false) {
    broadcastRef.current?.stop();
    broadcastRef.current = null;
    setSecondsLeft(null);
    await fetch(`/api/channels/${channelId}/stream`, { method: "DELETE" }).catch(() => {});
    if (videoRef.current) videoRef.current.srcObject = null;
    await poll();
    if (auto) alert("Your daily streaming time is up. Stream ended.");
  }

  const iAmLive = !!broadcastRef.current;
  const showPlayer = iAmLive || (status.live && !status.isBroadcaster);

  // Nothing to show
  if (!showPlayer && !(canBroadcast && isDesktop && !status.live)) return null;

  return (
    <div className="border-b border-[var(--border)] bg-black/40">
      {showPlayer && (
        <div className="relative">
          <video
            ref={videoRef}
            playsInline
            controls={!iAmLive}
            className="w-full max-h-[42vh] bg-black object-contain"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </div>
          {status.title && (
            <div className="absolute bottom-2 left-2 text-xs text-white/90 bg-black/50 px-2 py-0.5 rounded max-w-[70%] truncate">
              {status.title}
            </div>
          )}
          {iAmLive && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {secondsLeft !== null && secondsLeft <= 300 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-yellow-500 text-black">
                  {fmt(secondsLeft)} left
                </span>
              )}
              <button
                onClick={() => endBroadcast()}
                className="text-[11px] font-semibold px-2 py-1 rounded bg-white text-black flex items-center gap-1"
              >
                <X className="w-3 h-3" /> End
              </button>
            </div>
          )}
          {!iAmLive && status.broadcaster && (
            <div className="absolute bottom-2 right-2 text-[11px] text-white/80 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded">
              <Users className="w-3 h-3" /> @{status.broadcaster.handle}
            </div>
          )}
        </div>
      )}

      {canBroadcast && isDesktop && !status.live && !iAmLive && (
        <button
          onClick={goLive}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          {starting ? "Starting…" : "Go live — share your screen"}
        </button>
      )}
    </div>
  );
}
