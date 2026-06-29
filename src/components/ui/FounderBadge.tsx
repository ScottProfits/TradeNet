export default function FounderBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-full px-2 py-0.5">
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Crown */}
        <path d="M2 11h12l-1.5-6L9 8 8 5 7 8 3.5 5 2 11z" fill="#F59E0B" />
        <rect x="2" y="11" width="12" height="1.5" rx="0.5" fill="#F59E0B" />
      </svg>
      <span className="text-[10px] font-bold text-yellow-400 whitespace-nowrap">Founder</span>
    </span>
  );
}
