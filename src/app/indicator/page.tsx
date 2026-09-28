"use client";
import { useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { errorMessage } from "@/lib/apiError";

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
      // Web-only Stripe Checkout. On iOS the WebView will open it; access is
      // recorded by the webhook on return, then granted manually shortly after.
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

      {welcome && (
        <div className="glass-card rounded-2xl p-4 text-sm text-emerald-400">
          You&apos;re subscribed! We&apos;ll add your TradingView access shortly — usually
          within a few hours.
        </div>
      )}

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <p className="text-sm text-gray-300">
          Swing highs/lows across 1H, 4H and 1D, a 50% premium/discount level,
          fair value gaps, order blocks, SMT divergence, and session boxes for
          NQ and ES — all in one TradingView indicator.
        </p>
        <p className="text-xs text-gray-500">
          Delivered as invite-only access on TradingView. Enter your
          TradingView username at checkout — access is added by hand, usually
          within a few hours of subscribing.
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
    </div>
  );
}
