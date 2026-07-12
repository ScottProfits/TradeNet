"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Video } from "lucide-react";
import TradeCard from "@/components/feed/TradeCard";
import PostCard from "@/components/feed/PostCard";
import { realTradeToCardProps, RealTrade, RealPost } from "@/lib/tradeCardProps";
import { demoVideoItems } from "@/lib/demoData";

type VideoItem = ({ type: "trade" } & RealTrade) | ({ type: "post" } & RealPost);

export default function VideoTab() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const [items, setItems] = useState<VideoItem[]>(isDemo ? (demoVideoItems as VideoItem[]) : []);
  const [loading, setLoading] = useState(!isDemo);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (isDemo) { setItems(demoVideoItems as VideoItem[]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/videos");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => { load(); }, [load]);

  function handleDelete(id: string) {
    setDeletedIds((s) => new Set(s).add(id));
  }

  const visible = items.filter((item) => !deletedIds.has(item.id));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 bg-[var(--card)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Video className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">No videos yet</p>
        <p className="text-gray-600 text-sm mt-1">Post a video talking through a trade, your stats, or a recap.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((item) => {
        if (item.type === "trade") {
          const { trade, trader } = realTradeToCardProps(item);
          return (
            <TradeCard
              key={item.id}
              trade={trade}
              trader={trader}
              imageUrl={item.image_url ?? undefined}
              avatarUrl={item.profiles?.avatar_url ?? undefined}
              strategy={item.strategy ?? undefined}
              likedByMe={item.liked_by_me}
              verifiedPnl={item.verified_pnl}
              journalNote={item.journal_note ?? undefined}
              entry={item.entry}
              exit={item.exit}
              rawShares={item.shares ?? 0}
              onDelete={handleDelete}
              autoPlayVideo
            />
          );
        }
        return <PostCard key={item.id} post={item} onDelete={handleDelete} autoPlayVideo />;
      })}
    </div>
  );
}
