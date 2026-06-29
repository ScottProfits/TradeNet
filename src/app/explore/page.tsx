"use client";
import ExploreTab from "@/components/feed/ExploreTab";

export default function ExplorePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Explore</h1>
        <p className="text-gray-500 text-sm mt-1">Discover top traders and trending tickers</p>
      </div>
      <ExploreTab />
    </div>
  );
}
