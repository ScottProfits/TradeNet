"use client";
import { Heart, Share2, MessageCircle, Check, X, Mic } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ExpandableImage from "@/components/feed/ExpandableImage";
import ExpandableVideo from "@/components/feed/ExpandableVideo";
import ImageGallery from "@/components/feed/ImageGallery";
import { isVideoUrl } from "@/lib/isVideoUrl";
import CommentSection from "@/components/feed/CommentSection";
import CommentPill from "@/components/feed/CommentPill";
import DeleteSheet from "@/components/ui/DeleteSheet";
import DotsMenu from "@/components/ui/DotsMenu";
import SafeAvatar from "@/components/ui/SafeAvatar";
import { clsx } from "clsx";
import { timeAgo } from "@/lib/timeAgo";
import { getLikeOverride, setLikeOverride, clearLikeOverride } from "@/lib/likeCache";
import { RepostBanner, RepostButton, type Reposter } from "@/components/feed/Repost";

interface RealPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  image_urls?: string[] | null;
  likes_count: number;
  comments_count?: number;
  reposts_count?: number;
  liked_by_me?: boolean;
  created_at: string;
  profiles: {
    id: string;
    handle: string;
    avatar_url: string;
    verified: boolean;
  } | null;
}

export default function PostCard({ post, onDelete, autoPlayVideo = false, repostedBy, repostedByMe }: { post: RealPost; onDelete?: (id: string) => void; autoPlayVideo?: boolean; repostedBy?: Reposter | null; repostedByMe?: boolean }) {
  const { isSignedIn, userId } = useAuth();
  const [liked, setLiked] = useState(getLikeOverride(post.id) ?? post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comments_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentFocus, setCommentFocus] = useState(false);
  const [voiceStart, setVoiceStart] = useState(false);
  const [shared, setShared] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const profile = post.profiles;
  const isOwner = userId === post.user_id;


  async function handleLike() {
    if (!isSignedIn) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setLikeOverride(post.id, next);
    const res = await fetch("/api/like-post", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
    if (!res.ok) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      clearLikeOverride(post.id);
    }
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

  async function handleDelete() {
    setShowDelete(false);
    setDeleted(true);
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    onDelete?.(post.id);
  }

  async function handleSaveEdit() {
    if (!editContent.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) { setContent(editContent); setEditing(false); }
    setSaving(false);
  }

  if (deleted) return null;

  return (
    <div
      className="glass-card rounded-2xl p-3 sm:p-4 space-y-3"
    >
      {repostedBy && <RepostBanner by={repostedBy} />}
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${profile?.handle}`} className="shrink-0">
          <SafeAvatar src={profile?.avatar_url} alt={profile?.handle ?? ""} initials={profile?.handle ?? "?"} className="w-10 h-10 text-sm" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${profile?.handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors text-sm">
              @{profile?.handle}
            </Link>
            {profile?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
          </div>
          <p className="text-xs text-gray-500">
            {timeAgo(post.created_at)}
          </p>
        </div>
        {isOwner && !editing && (
          <DotsMenu
            onEdit={() => { setEditing(true); setEditContent(content); }}
            onDelete={() => setShowDelete(true)}
          />
        )}
      </div>

      {/* Content / Edit */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
            className="w-full bg-[var(--bg)] border border-[var(--green)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={saving || !editContent.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--green)] text-black px-3 py-1.5 rounded-lg disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      )}

      {/* Image/Video gallery — up to 3 */}
      {(() => {
        const media = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];
        if (!media.length) return null;
        if (media.length === 1) {
          const src = media[0];
          return (
            <div className="rounded-lg overflow-hidden border border-[var(--border)]">
              {isVideoUrl(src) ? <ExpandableVideo src={src} /> : <ExpandableImage src={src} alt="Post media" />}
            </div>
          );
        }
        // Compose only allows up to 3 photos OR a single video (never mixed),
        // so a multi-item gallery is always all-images — swipeable lightbox.
        if (media.every((src) => !isVideoUrl(src))) {
          return <ImageGallery images={media} />;
        }
        return (
          <div className={clsx("grid gap-1 rounded-lg overflow-hidden border border-[var(--border)]", media.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {media.map((src, i) => (
              <div key={i} className="aspect-square">
                {isVideoUrl(src) ? <ExpandableVideo src={src} /> : <ExpandableImage src={src} alt={`Post media ${i + 1}`} thumbnailClassName="h-full" />}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-1">
        <button
          onClick={handleLike}
          className={clsx("flex items-center gap-1.5 text-sm transition-colors", liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400")}
        >
          <Heart className={clsx("w-4 h-4", liked && "fill-current")} />
          {likeCount}
        </button>
        <button
          onClick={() => { setShowComments((s) => !s); setCommentFocus(false); setVoiceStart(false); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount}
        </button>
        <RepostButton targetType="post" targetId={post.id} initialReposted={repostedByMe} count={post.reposts_count ?? 0} ownPost={isOwner} />
        <CommentPill onOpen={() => { setShowComments(true); setCommentFocus(true); setVoiceStart(false); }} />
        <button
          onClick={() => { setShowComments(true); setCommentFocus(false); setVoiceStart(true); }}
          className="shrink-0 flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-[2px] text-[12px] text-gray-500 hover:text-gray-300 hover:border-white/15 transition-colors"
          aria-label="Voice comment"
        >
          <Mic className="w-3.5 h-3.5" /> Voice
        </button>
        <button onClick={handleShare} className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors shrink-0">
          <Share2 className="w-4 h-4" />
          {shared ? "Copied!" : "Share"}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection
          postId={post.id}
          autoFocus={commentFocus}
          autoRecord={voiceStart}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
          onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
          onCountLoaded={(n) => setCommentCount(n)}
        />
      )}

      {showDelete && (
        <DeleteSheet
          label="post"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
