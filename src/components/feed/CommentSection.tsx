"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Send, CornerDownRight, Heart, Mic, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import DeleteSheet from "@/components/ui/DeleteSheet";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VoiceNote from "@/components/feed/VoiceNote";
import { supabase } from "@/lib/supabase";
import { extFor, voiceRecordingSupported } from "@/lib/voice";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  profiles: {
    handle: string;
    avatar_url: string;
    verified: boolean;
  };
}

function fmtClock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CommentSection({ tradeId, postId, onCommentAdded, onCommentDeleted, onCountLoaded, focusText, startVoice }: {
  tradeId?: string;
  postId?: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  onCountLoaded?: (n: number) => void;
  // Nonces — bump to trigger: focusText focuses the composer (and leaves
  // voice mode), startVoice opens the voice recorder.
  focusText?: number;
  startVoice?: number;
}) {
  const { isSignedIn, userId } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string; topLevelId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- voice comment recorder ----
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [clip, setClip] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [recError, setRecError] = useState("");
  const MAX_SECONDS = 25;
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setRecError("");
    if (!voiceRecordingSupported()) {
      setRecError("Voice recording works in the Safari browser — open ryzr.app in Safari. (Coming to the app in the next update.)");
      return;
    }
    if (clip) { URL.revokeObjectURL(clip.url); setClip(null); }
    try {
      // Acquire the mic once and reuse the stream for every recording in this
      // thread — re-requesting is what re-triggers the permission prompt.
      if (!streamRef.current || !streamRef.current.getAudioTracks().some((t) => t.readyState === "live")) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const stream = streamRef.current;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
        (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
      );
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        if (tickRef.current) clearInterval(tickRef.current);
        setRecording(false);
        const seconds = Math.min(MAX_SECONDS, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setClip({ blob, url: URL.createObjectURL(blob), seconds });
      };
      mediaRef.current = mr;
      startedAtRef.current = Date.now();
      setElapsed(0);
      mr.start();
      setRecording(true);
      tickRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startedAtRef.current) / 1000);
        setElapsed(s);
        if (s >= MAX_SECONDS) stopRecording();
      }, 200);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setRecError("Microphone access is off. Turn it on in Settings › Ryzr › Microphone, then try again.");
      } else if (name === "NotFoundError") {
        setRecError("No microphone found.");
      } else {
        setRecError("Couldn't start recording — try again.");
      }
    }
  }, [clip, stopRecording]);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const discardClip = useCallback(() => {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setElapsed(0);
  }, [clip]);

  const exitVoice = useCallback(() => {
    stopRecording();
    discardClip();
    releaseStream();
    setVoiceMode(false);
  }, [stopRecording, discardClip, releaseStream]);

  // "Voice" opens the recorder in an idle state — the user hits record.
  useEffect(() => {
    if (startVoice) { discardClip(); setVoiceMode(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startVoice]);

  // Release the mic only when the thread unmounts.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entityId = tradeId ?? postId ?? "";
  const paramKey = tradeId ? "tradeId" : "postId";

  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/comments?${paramKey}=${entityId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d: Comment[]) => {
        setComments(d);
        setLoading(false);
        onCountLoaded?.(d.length);
        if (d.length) {
          const ids = d.map((c) => c.id).join(",");
          fetch(`/api/comment-likes?commentIds=${ids}`)
            .then((r) => r.ok ? r.json() : { counts: {}, liked: {} })
            .then(({ counts, liked }) => { setLikeCounts(counts); setLikedMap(liked); });
        }
      });
  }, [entityId, paramKey]);

  useEffect(() => {
    if (!focusText) return;
    exitVoice();
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusText]);

  const startReply = useCallback((commentId: string, handle: string, topLevelId: string) => {
    setReplyTo({ id: commentId, handle, topLevelId });
    setText(`@${handle} `);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function cancelReply() {
    setReplyTo(null);
    setText("");
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !clip) || posting) return;
    setPosting(true);

    let audioUrl: string | null = null;
    let audioDuration: number | null = null;
    if (clip && userId) {
      const ext = extFor(clip.blob.type);
      const path = `${userId}/voice-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("trade-images")
        .upload(path, clip.blob, { contentType: clip.blob.type || "audio/webm" });
      if (!upErr) {
        audioUrl = supabase.storage.from("trade-images").getPublicUrl(path).data.publicUrl;
        audioDuration = clip.seconds;
      } else {
        setRecError("Upload failed — try again.");
        setPosting(false);
        return;
      }
    }

    const parentId = replyTo?.topLevelId ?? null;
    const replyToCommentId = replyTo?.id ?? null;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: tradeId ?? null, postId: postId ?? null, content: audioUrl ? "" : text, parentId, replyToCommentId, audioUrl, audioDuration }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((c) => [...c, comment]);
      setLikeCounts((prev) => ({ ...prev, [comment.id]: 0 }));
      setLikedMap((prev) => ({ ...prev, [comment.id]: false }));
      setText("");
      setReplyTo(null);
      discardClip();
      releaseStream();
      setVoiceMode(false);
      onCommentAdded?.();
    }
    setPosting(false);
  }

  async function handleDelete(commentId: string) {
    await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setComments((c) => c.filter((x) => x.id !== commentId));
    onCommentDeleted?.();
  }

  async function handleLike(commentId: string) {
    if (!isSignedIn) return;
    const wasLiked = likedMap[commentId];
    setLikedMap((prev) => ({ ...prev, [commentId]: !wasLiked }));
    setLikeCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] ?? 0) + (wasLiked ? -1 : 1) }));
    await fetch("/api/comment-likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <div className="space-y-3 pt-1 border-t border-[var(--border)]">
      {loading ? (
        <p className="text-xs text-gray-600 py-2">Loading comments...</p>
      ) : (
        <>
          {topLevel.length === 0 && (
            <p className="text-xs text-gray-600 py-2">No comments yet. Be the first.</p>
          )}
          <div className="space-y-3">
            {topLevel.map((c) => (
              <div key={c.id} id={`comment-${c.id}`}>
                <CommentRow
                  c={c}
                  userId={userId}
                  liked={likedMap[c.id] ?? false}
                  likeCount={likeCounts[c.id] ?? 0}
                  onDelete={handleDelete}
                  onReply={(id, handle) => startReply(id, handle, c.id)}
                  onLike={handleLike}
                />
                {repliesFor(c.id).map((r) => (
                  <div key={r.id} id={`comment-${r.id}`} className="ml-9 mt-2">
                    <CommentRow
                      c={r}
                      userId={userId}
                      liked={likedMap[r.id] ?? false}
                      likeCount={likeCounts[r.id] ?? 0}
                      onDelete={handleDelete}
                      onReply={(_, handle) => startReply(r.id, handle, c.id)}
                      onLike={handleLike}
                      isReply
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {isSignedIn && (
        <div className="space-y-1">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CornerDownRight className="w-3 h-3" />
              <span>Replying to @{replyTo.handle}</span>
              <button onClick={cancelReply} className="text-gray-600 hover:text-white ml-auto">Cancel</button>
            </div>
          )}
          {recError && <p className="text-xs text-[var(--red)]">{recError}</p>}
          {recording ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-[var(--red)]/40 bg-[var(--red)]/5 px-3 py-1.5">
                <Mic className="w-3.5 h-3.5 text-[var(--red)] animate-pulse" />
                <span className="text-[13px] text-white tabular-nums">{fmtClock(elapsed)}</span>
                <span className="text-[11px] text-gray-600">/ 0:25</span>
              </div>
              <button type="button" onClick={exitVoice} className="text-xs text-gray-500 hover:text-white">Cancel</button>
              <button
                onClick={stopRecording}
                type="button"
                className="ml-auto shrink-0 w-9 h-9 rounded-full bg-[var(--red)] text-white flex items-center justify-center"
                aria-label="Stop recording"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          ) : clip ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={discardClip} className="p-2 text-gray-500 hover:text-[var(--red)]" aria-label="Delete recording">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex-1"><VoiceNote src={clip.url} duration={clip.seconds} /></div>
              <button
                type="button"
                onClick={handlePost}
                disabled={posting}
                className="p-2 bg-[var(--green)] text-black rounded-xl hover:bg-[var(--green)]/90 transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : voiceMode ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startRecording}
                className="shrink-0 w-10 h-10 rounded-full bg-[var(--red)] text-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Start recording"
              >
                <Mic className="w-5 h-5" />
              </button>
              <span className="text-[13px] text-gray-500">
                Tap to record {replyTo ? `a reply to @${replyTo.handle}` : "a voice comment"} · 25s max
              </span>
              <button type="button" onClick={exitVoice} className="ml-auto text-xs text-gray-500 hover:text-white">Cancel</button>
            </div>
          ) : (
            <form onSubmit={handlePost} className="flex gap-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={replyTo ? `Reply to @${replyTo.handle}...` : "Add a comment..."}
                maxLength={280}
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
              <button
                type="button"
                onClick={() => setVoiceMode(true)}
                className="p-2 bg-[var(--bg)] border border-[var(--border)] text-gray-400 rounded-xl hover:text-white hover:border-[var(--green)] transition-colors"
                aria-label={replyTo ? "Voice reply" : "Record a voice comment"}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="p-2 bg-[var(--green)] text-black rounded-xl hover:bg-[var(--green)]/90 transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function CommentRow({ c, userId, liked, likeCount, onDelete, onReply, onLike, isReply }: {
  c: Comment;
  userId: string | null | undefined;
  liked: boolean;
  likeCount: number;
  onDelete: (id: string) => void;
  onReply: (id: string, handle: string) => void;
  onLike: (id: string) => void;
  isReply?: boolean;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const isOwner = c.user_id === userId;
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  function startPress(e: React.PointerEvent) {
    if (!isOwner) return;
    cancelPress();
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => setShowDelete(true), 550);
  }
  function movePress(e: React.PointerEvent) {
    if (!pressOrigin.current) return;
    if (Math.abs(e.clientX - pressOrigin.current.x) > 12 || Math.abs(e.clientY - pressOrigin.current.y) > 12) cancelPress();
  }
  function cancelPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    pressOrigin.current = null;
  }

  return (
    <div className="flex gap-2.5 group select-none">
      <Link href={`/profile/${c.profiles?.handle}`} className="shrink-0">
        <SafeAvatar src={c.profiles?.avatar_url} alt={c.profiles?.handle ?? ""} initials={c.profiles?.handle ?? "?"} className="w-7 h-7 text-xs" />
      </Link>
      <div
        className={`flex-1 bg-[var(--bg)] rounded-xl px-3 py-2 ${isOwner ? "[-webkit-touch-callout:none]" : ""}`}
        onPointerDown={startPress}
        onPointerMove={movePress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => { if (isOwner) e.preventDefault(); }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${c.profiles?.handle}`} className="text-xs font-semibold text-white hover:text-[var(--green)] transition-colors">
              @{c.profiles?.handle}
            </Link>
            {c.profiles?.verified && <VerifiedBadge className="w-3 h-3" />}
            <span className="text-xs text-gray-600">
              {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReply(c.id, c.profiles?.handle)}
              className="text-xs text-gray-600 hover:text-[var(--green)] transition-colors"
            >
              Reply
            </button>
            <button
              onClick={() => onLike(c.id)}
              className="flex items-center gap-1 text-xs transition-colors"
            >
              <Heart className={`w-3 h-3 transition-colors ${liked ? "fill-pink-400 text-pink-400" : "text-gray-600 hover:text-pink-400"}`} />
              {likeCount > 0 && (
                <span className={liked ? "text-pink-400" : "text-gray-600"}>{likeCount}</span>
              )}
            </button>
          </div>
        </div>
        {c.audio_url && (
          <div className="mt-1 mb-0.5">
            <VoiceNote src={c.audio_url} duration={c.audio_duration ?? 0} />
          </div>
        )}
        {c.content && <p className="text-sm text-gray-300">{c.content}</p>}
      </div>
      {showDelete && (
        <DeleteSheet
          label={isReply ? "reply" : "comment"}
          onConfirm={() => { setShowDelete(false); onDelete(c.id); }}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
