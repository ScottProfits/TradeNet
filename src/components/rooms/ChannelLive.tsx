"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Radio, X, Loader2, Volume2, VolumeX, Maximize2, Play } from "lucide-react";
import { startBroadcast, watchStream, localDay, type Broadcast } from "@/lib/streamClient";

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
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const broadcastRef = useRef<Broadcast | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerPcRef = useRef<RTCPeerConnection | null>(null);
  const watchingIdRef = useRef<string | null>(null);
  const userPausedRef = useRef(false);

  const isDesktop = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
  const iAmLive = !!broadcastRef.current;
  const showPlayer = iAmLive || (status.live && !status.isBroadcaster);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/channels/${channelId}/stream`);
      if (!r.ok) return;
      setStatus(await r.json());
    } catch {}
  }, [channelId]);

  // Single persistent instance — reset everything whenever the topic changes,
  // and hard-teardown on unmount (also end the broadcast, don't orphan it).
  useEffect(() => {
    setStatus({ live: false });
    setSecondsLeft(null);
    setErr(null);
    return () => {
      if (broadcastRef.current) {
        broadcastRef.current.stop();
        fetch(`/api/channels/${channelId}/stream`, { method: "DELETE", keepalive: true }).catch(() => {});
      }
      broadcastRef.current = null;
      viewerPcRef.current?.close();
      viewerPcRef.current = null;
      watchingIdRef.current = null;
    };
  }, [channelId]);

  // Tab close / navigate away while broadcasting → end the stream server-side.
  useEffect(() => {
    const end = () => {
      if (!broadcastRef.current) return;
      broadcastRef.current.stop();
      fetch(`/api/channels/${channelId}/stream`, { method: "DELETE", keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", end);
    window.addEventListener("beforeunload", end);
    return () => {
      window.removeEventListener("pagehide", end);
      window.removeEventListener("beforeunload", end);
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
      userPausedRef.current = false;
      setErr(null);
      watchStream(status.streamId)
        .then(({ pc, stream }) => {
          viewerPcRef.current = pc;
          const v = videoRef.current;
          if (v) {
            v.srcObject = stream;
            v.muted = true;
            setMuted(true);
            const tryPlay = (n = 0) => v.play().catch(() => { if (n < 5) setTimeout(() => tryPlay(n + 1), 200); });
            tryPlay();
          }
        })
        .catch(() => {
          watchingIdRef.current = null;
          setErr("Couldn't connect to the stream.");
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
    setErr(null);
    const title = prompt("Stream title (optional)") ?? undefined;
    const withMic = confirm("Include your microphone? (Cancel = screen audio only)");
    setStarting(true);
    try {
      const b = await startBroadcast(channelId, { title, withMic }, () => {
        // native "Stop sharing" → tear our UI down too
        broadcastRef.current = null;
        setSecondsLeft(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        setStatus({ live: false });
        poll();
      });
      broadcastRef.current = b;
      const v = videoRef.current;
      if (v) {
        v.srcObject = b.stream;
        v.muted = true;
        v.play().catch(() => {});
      }
      await poll();
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "NotReadableError") {
        setErr("Screen share was blocked or cancelled — tap Go live and pick a window.");
      } else {
        setErr(e instanceof Error ? e.message : "Could not start the stream.");
      }
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

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.play().catch(() => {});
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { userPausedRef.current = false; v.play().catch(() => {}); }
    else { userPausedRef.current = true; v.pause(); }
  }

  // A live stream should just keep playing. Only an explicit user pause
  // (togglePlay) stops it — any other pause (fullscreen exit, tab switch,
  // re-render) gets auto-resumed.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || iAmLive) return;
    const onPlay = () => setPaused(false);
    const onPause = () => {
      setPaused(true);
      if (!userPausedRef.current) setTimeout(() => v.play().catch(() => {}), 60);
    };
    const onFsEnd = () => {
      if (!userPausedRef.current) setTimeout(() => v.play().catch(() => {}), 60);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !userPausedRef.current) v.play().catch(() => {});
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("webkitendfullscreen", onFsEnd);
    v.addEventListener("webkitpresentationmodechanged", onFsEnd);
    document.addEventListener("fullscreenchange", onFsEnd);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("webkitendfullscreen", onFsEnd);
      v.removeEventListener("webkitpresentationmodechanged", onFsEnd);
      document.removeEventListener("fullscreenchange", onFsEnd);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [showPlayer, iAmLive]); // eslint-disable-line react-hooks/exhaustive-deps

  function goFullscreen() {
    const el = wrapRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iOS Safari — native player
    else if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  if (!showPlayer && !(canBroadcast && isDesktop)) {
    return err ? <p className="px-4 py-2 text-xs text-[var(--red)] border-b border-[var(--border)]">{err}</p> : null;
  }

  return (
    <div className="border-b border-[var(--border)] bg-black/40">
      {showPlayer && (
        <div ref={wrapRef} className="relative bg-black">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={muted}
            onClick={iAmLive ? undefined : togglePlay}
            className="w-full max-h-[46vh] bg-black object-contain"
          />

          {/* tap-to-play — always reachable for viewers, e.g. after fullscreen */}
          {!iAmLive && paused && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40"
              aria-label="Play"
            >
              <span className="w-14 h-14 rounded-full bg-white/90 text-black flex items-center justify-center">
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              </span>
            </button>
          )}

          <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded bg-red-600 text-white pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </div>

          {status.title && (
            <div className="absolute bottom-2 left-2 text-xs text-white/90 bg-black/50 px-2 py-0.5 rounded max-w-[60%] truncate">
              {status.title}
            </div>
          )}

          {/* viewer controls */}
          {!iAmLive && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              {status.broadcaster && (
                <span className="text-[11px] text-white/80 bg-black/50 px-2 py-0.5 rounded">@{status.broadcaster.handle}</span>
              )}
              <button onClick={toggleMute} className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={goFullscreen} className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Fullscreen">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* broadcaster controls */}
          {iAmLive && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {secondsLeft !== null && secondsLeft <= 300 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-yellow-500 text-black">{fmt(secondsLeft)} left</span>
              )}
              <button onClick={() => endBroadcast()} className="text-[11px] font-semibold px-2 py-1 rounded bg-white text-black flex items-center gap-1">
                <X className="w-3 h-3" /> End
              </button>
            </div>
          )}
        </div>
      )}

      {err && showPlayer && <p className="px-4 py-1.5 text-xs text-[var(--red)]">{err}</p>}

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
      {canBroadcast && isDesktop && err && !starting && !showPlayer && (
        <p className="px-4 pb-2 text-xs text-[var(--red)]">{err}</p>
      )}
    </div>
  );
}
