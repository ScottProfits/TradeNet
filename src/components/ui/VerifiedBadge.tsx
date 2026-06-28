// Bullish candle verified badge
export default function VerifiedBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wick top */}
      <line x1="8" y1="1" x2="8" y2="3.5" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" />
      {/* Bullish candle body (green, open < close) */}
      <rect x="5" y="3.5" width="6" height="7" rx="1" fill="#00C896" />
      {/* Wick bottom */}
      <line x1="8" y1="10.5" x2="8" y2="14" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
