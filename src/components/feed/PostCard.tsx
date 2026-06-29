"use client";
import { Heart, Share2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CommentSection from "@/components/feed/CommentSection";
import { clsx } from "clsx";

interface RealPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count?: number;
  liked_by_me?: boolean;
  created_at: string;
  profiles: {
    id: string;
    handle: string;
    avatar_url: string;
    verified: boolean;
  } | null;
}

export default function PostCard({ post }: { post: RealPost }) {
  const { isSignedIn } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comments_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [shared, setShared] = useState(false);
  const profile = post.profiles;
  const initials = profile?.handle?.slice(0, 2).toUpperCase() ?? "?";

  async function handleLike() {
    if (!isSignedIn) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    await fetch("/api/like-post", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
  }

  async function handleShare() {
    const url = `${window.location.origin}/profile/${profile?.handle}`;
    if (navigator.share) {
      try { await navigator.share({ title: `@${profile?.handle} on Ryzr`, text: post.content, url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${profile?.handle}`} className="shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.handle} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
          )}
        </Link>
        <div>
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${profile?.handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors text-sm">
              @{profile?.handle}
            </Link>
            {profile?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
          </div>
          <p className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {/* Image/Video */}
      {post.image_url && (
        <div className="rounded-lg overflow-hidden border border-[var(--border)]">
          {/\.(mp4|mov|webm)/i.test(post.image_url) ? (
            <video src={post.image_url} controls className="w-full max-h-80 object-cover" />
          ) : (
            <Image src={post.image_url} alt="Post media" width={600} height={300} className="w-full object-cover" unoptimized />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleLike}
          className={clsx("flex items-center gap-1.5 text-sm transition-colors", liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400")}
        >
          <Heart className={clsx("w-4 h-4", liked && "fill-current")} />
          {likeCount}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount}
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <Share2 className="w-4 h-4" />
          {shared ? "Copied!" : "Share"}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection
          postId={post.id}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
          onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
          onCountLoaded={(n) => setCommentCount(n)}
        />
      )}
    </div>
  );
}
