"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Send, CornerDownRight, Heart } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import DeleteSheet from "@/components/ui/DeleteSheet";
import SafeAvatar from "@/components/ui/SafeAvatar";
import { useLongPress } from "@/hooks/useLongPress";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    handle: string;
    avatar_url: string;
    verified: boolean;
  };
}

export default function CommentSection({ tradeId, postId, onCommentAdded, onCommentDeleted, onCountLoaded }: {
  tradeId?: string;
  postId?: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  onCountLoaded?: (n: number) => void;
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
    if (!text.trim() || posting) return;
    setPosting(true);
    // Always attach reply to the top-level comment so all replies stay flat under it
    const parentId = replyTo?.topLevelId ?? null;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: tradeId ?? null, postId: postId ?? null, content: text, parentId }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((c) => [...c, comment]);
      setLikeCounts((prev) => ({ ...prev, [comment.id]: 0 }));
      setLikedMap((prev) => ({ ...prev, [comment.id]: false }));
      setText("");
      setReplyTo(null);
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
              type="submit"
              disabled={posting || !text.trim()}
              className="p-2 bg-[var(--green)] text-black rounded-xl hover:bg-[var(--green)]/90 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
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
  const longPress = useLongPress(() => { if (isOwner) setShowDelete(true); }, 2000);

  return (
    <div className="flex gap-2.5 group select-none">
      <Link href={`/profile/${c.profiles?.handle}`} className="shrink-0">
        <SafeAvatar src={c.profiles?.avatar_url} alt={c.profiles?.handle ?? ""} initials={c.profiles?.handle ?? "?"} className="w-7 h-7 text-xs" />
      </Link>
      <div className="flex-1 bg-[var(--bg)] rounded-xl px-3 py-2" {...longPress}>
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
        <p className="text-sm text-gray-300">{c.content}</p>
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
