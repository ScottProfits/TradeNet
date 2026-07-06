import { strategies, traders } from "@/lib/mock-data";
import Tag from "@/components/ui/Tag";
import Avatar from "@/components/ui/Avatar";

export default function StrategiesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Strategies</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((s) => {
          const topTraders = traders.slice(0, 3);
          return (
            <div key={s.id} className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-white text-lg">{s.name}</h3>
                <Tag label={s.tag} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-bold text-white">{s.winRate}%</p>
                  <p className="text-xs text-gray-500">Community win rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.traders.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Traders using this</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Top traders</p>
                <div className="flex -space-x-2">
                  {topTraders.map((t) => (
                    <div key={t.id} className="ring-2 ring-[var(--card)] rounded-full">
                      <Avatar initials={t.initials} color={t.color} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full py-2 text-sm font-medium text-[var(--green)] border border-[var(--green)]/30 rounded-lg hover:bg-[var(--green)]/10 transition-colors">
                View strategy →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
