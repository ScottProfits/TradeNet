const tickers = [
  { symbol: "SPY", name: "S&P 500 ETF", price: 548.32, change: 1.24, pct: 0.23 },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", price: 472.18, change: -2.91, pct: -0.61 },
  { symbol: "NVDA", name: "NVIDIA Corp", price: 138.45, change: 8.62, pct: 6.64 },
  { symbol: "AAPL", name: "Apple Inc", price: 213.07, change: 1.83, pct: 0.87 },
  { symbol: "TSLA", name: "Tesla Inc", price: 248.90, change: -5.42, pct: -2.13 },
  { symbol: "META", name: "Meta Platforms", price: 565.12, change: 12.30, pct: 2.23 },
  { symbol: "AMZN", name: "Amazon.com", price: 198.44, change: 3.12, pct: 1.60 },
  { symbol: "MSFT", name: "Microsoft Corp", price: 446.83, change: -0.94, pct: -0.21 },
];

export default function MarketsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Markets</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-xs text-gray-500 px-4 py-3">Symbol</th>
              <th className="text-left text-xs text-gray-500 px-4 py-3">Name</th>
              <th className="text-right text-xs text-gray-500 px-4 py-3">Price</th>
              <th className="text-right text-xs text-gray-500 px-4 py-3">Change</th>
              <th className="text-right text-xs text-gray-500 px-4 py-3">%</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((t) => (
              <tr key={t.symbol} className="border-b border-[var(--border)] last:border-0 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 font-bold text-white">{t.symbol}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{t.name}</td>
                <td className="px-4 py-3 text-right text-sm text-white">${t.price.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right text-sm font-medium ${t.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right text-sm font-medium ${t.pct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {t.pct >= 0 ? "+" : ""}{t.pct.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
