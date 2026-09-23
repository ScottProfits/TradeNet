"use client";
import { useParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import PostCard from "@/components/feed/PostCard";
import { useCachedFetch } from "@/lib/useCachedFetch";
import type { RealPost } from "@/lib/tradeCardProps";

// Single post view — the target of "liked/commented on your post"
// notifications, so they open the exact post instead of the generic feed.
export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, loading } = useCachedFetch<RealPost>(`post:${id}`, `/api/posts/${id}`);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <BackButton iconOnly fallbackHref="/notifications" className="text-gray-400 hover:text-white transition-colors" />
      {post ? (
        <PostCard post={post} />
      ) : (
        <p className="text-gray-500 text-sm text-center pt-10">{loading ? "Loading..." : "This post isn't available."}</p>
      )}
    </div>
  );
}
