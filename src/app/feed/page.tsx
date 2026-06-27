import { feedTrades, traders } from "@/lib/mock-data";
import TradeCard from "@/components/feed/TradeCard";
import SidebarProfile from "@/components/feed/SidebarProfile";
import SidebarRight from "@/components/feed/SidebarRight";

export default function FeedPage() {
  return (
    <div className="grid grid-cols-[280px_1fr_280px] gap-6">
      <aside className="space-y-4">
        <SidebarProfile />
      </aside>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Live feed</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
        {feedTrades.map((trade) => {
          const trader = traders.find((t) => t.id === trade.traderId)!;
          return <TradeCard key={trade.id} trade={trade} trader={trader} />;
        })}
      </section>

      <aside>
        <SidebarRight />
      </aside>
    </div>
  );
}
