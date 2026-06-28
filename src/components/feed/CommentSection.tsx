"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Send, Trash2 } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    handle: string;
    avatar_url: string;
    verified: boolean;
  };
}

export default function CommentSection({ tradeId, onCommentAdded, onCommentDeleted, onCountLoaded }: { tradeId: string; onCommentAdded?: () => void; onCommentDeleted?: () => void; onCountLoaded?: (n: number) => void }) {
  const { isSignedIn, userId } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?tradeId=${tradeId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setComments(d); setLoading(false); onCountLoaded?.(d.length); });
  }, [tradeId]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, content: text }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((c) => [...c, comment]);
      setText("");
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

  return (
    <div className="space-y-3 pt-1 border-t border-[var(--border)]">
      {loading ? (
        <p className="text-xs text-gray-600 py-2">Loading comments...</p>
      ) : (
        <>
          {comments.length === 0 && (
            <p className="text-xs text-gray-600 py-2">No comments yet. Be the first.</p>
          )}
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5 group">
                <Link href={`/profile/${c.profiles?.handle}`} className="shrink-0">
                  {c.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.profiles.avatar_url} alt={c.profiles.handle} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {c.profiles?.handle?.slice(0, 2).toUpperCase() ?? "?"}
                    </div>
                  )}
                </Link>
                <div className="flex-1 bg-[var(--bg)] rounded-xl px-3 py-2">
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
                    {c.user_id === userId && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-gray-500 hover:text-[var(--red)] transition-colors p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-300">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isSignedIn && (
        <form onSubmit={handlePost} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
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
      )}
    </div>
  );
}
