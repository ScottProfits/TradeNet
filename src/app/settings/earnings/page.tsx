"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DollarSign, ExternalLink } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import { errorMessage } from "@/lib/apiError";

export default function EarningsPage() {
  return (
    <Suspense fallback={null}>
      <EarningsInner />
    </Suspense>
  );
}

function EarningsInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<{
    connected: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted?: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/creator/onboard");
    if (res.ok) setStatus(await res.json());
    else setStatus({ connected: false, payoutsEnabled: false });
  }, []);

  useEffect(() => { load(); }, [load, params]);

  async function connect() {
    setBusy(true);
    const res = await fetch("/api/creator/onboard", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      alert(await errorMessage(res));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <BackButton fallbackHref="/settings" iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-[var(--green)]" /> Creator earnings
      </h1>

      <div className="glass-card rounded-2xl p-5 space-y-4">
        {!status && <p className="text-gray-500 text-sm">Loading...</p>}

        {status && status.payoutsEnabled && (
          <>
            <p className="text-sm text-white font-semibold">✅ Payouts active</p>
            <p className="text-xs text-gray-500">
              You can set a monthly price on any channel you own. Ryzr keeps a 4.5% platform fee; Stripe pays you out on a
              rolling schedule.
            </p>
            <button
              onClick={connect}
              disabled={busy}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white"
            >
              <ExternalLink className="w-4 h-4" /> Open Stripe dashboard
            </button>
          </>
        )}

        {status && status.connected && !status.payoutsEnabled && (
          <>
            <p className="text-sm text-yellow-500 font-semibold">Setup incomplete</p>
            <p className="text-xs text-gray-500">
              Stripe still needs a few details before you can receive payouts.
            </p>
            <button
              onClick={connect}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-[var(--green)] text-black text-sm font-semibold disabled:opacity-40"
            >
              {busy ? "Opening..." : "Finish setup"}
            </button>
          </>
        )}

        {status && !status.connected && (
          <>
            <p className="text-sm text-white font-semibold">Get paid for your channels</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Connect a Stripe account to charge a monthly membership for channels you own. Takes about 2 minutes — you&apos;ll
              need your bank details and ID. Ryzr keeps a 4.5% platform fee.
            </p>
            <button
              onClick={connect}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-[var(--green)] text-black text-sm font-semibold disabled:opacity-40"
            >
              {busy ? "Opening..." : "Connect payouts"}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        Memberships are sold only on the web. The iOS app shows channel content to existing members but doesn&apos;t sell
        subscriptions.
      </p>
    </div>
  );
}
