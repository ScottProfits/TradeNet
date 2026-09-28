"use client";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { errorMessage } from "@/lib/apiError";
import { INDICATOR_SCRIPT_URL } from "@/lib/indicator";

export default function IndicatorPage() {
  return (
    <Suspense fallback={null}>
      <IndicatorPageInner />
    </Suspense>
  );
}

function IndicatorPageInner() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!userId) { setChecked(true); return; }
    fetch("/api/indicator/subscribe").then(async (res) => {
      if (res.ok) setActive((await res.json()).active);
      setChecked(true);
    });
  }, [userId]);

  async function subscribe() {
    if (!userId) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent("/indicator")}`);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/indicator/subscribe", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      // Web-only Stripe Checkout. On iOS the WebView will open it; the
      // TradingView link shows immediately once we're back (see below).
      window.location.href = url;
      return;
    }
    setError(await errorMessage(res));
    setLoading(false);
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">HTF Swings Indicator</h1>

      {welcome && !active && checked && (
        <div className="glass-card rounded-2xl p-4 text-sm text-emerald-400">
          You&apos;re subscribed! Setting things up…
        </div>
      )}

      {active && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-sm text-emerald-400 font-semibold">✅ You&apos;re subscribed</p>
          <p className="text-sm text-gray-300">
            Open the link below on TradingView, click <strong>&quot;Use on chart&quot;</strong>, and you&apos;re set —
            no waiting on us.
          </p>
          <a
            href={INDICATOR_SCRIPT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full py-3 rounded-xl bg-emerald-500 text-black font-semibold"
          >
            Open Scotts Indicator on TradingView
          </a>
        </div>
      )}

      {!active && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-sm text-gray-300">
            Swing highs/lows across 1H, 4H and 1D, a 50% premium/discount level,
            fair value gaps, order blocks, SMT divergence, and session boxes for
            NQ and ES — all in one TradingView indicator.
          </p>
          <p className="text-xs text-gray-500">
            Delivered instantly — subscribe and you&apos;ll get a direct link to add it
            to your TradingView chart right away.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={subscribe}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Redirecting…" : "Subscribe — monthly"}
          </button>
        </div>
      )}
    </div>
  );
}
