"use client";
import { useEffect, useState, useCallback } from "react";
import BackButton from "@/components/ui/BackButton";
import { timeAgo } from "@/lib/timeAgo";

interface IndicatorSub {
  id: string;
  user_id: string;
  tv_username: string;
  status: "needs_grant" | "active" | "needs_revoke" | "canceled";
  created_at: string;
}

export default function AdminIndicatorAccessPage() {
  const [subs, setSubs] = useState<IndicatorSub[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/indicator-access");
    if (res.status === 403) { setForbidden(true); return; }
    if (res.ok) setSubs(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/indicator-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  if (forbidden) return <p className="text-gray-500 text-sm text-center pt-20">Not authorized.</p>;

  const needsGrant = subs.filter((s) => s.status === "needs_grant");
  const needsRevoke = subs.filter((s) => s.status === "needs_revoke");
  const rest = subs.filter((s) => s.status === "active" || s.status === "canceled");

  const Row = ({ s }: { s: IndicatorSub }) => (
    <div key={s.id} className="glass-card rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>TradingView: @{s.tv_username || "(not provided)"}</span>
        <span>{timeAgo(s.created_at)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={
            s.status === "needs_grant" ? "text-yellow-500 text-xs" :
            s.status === "needs_revoke" ? "text-red-400 text-xs" :
            s.status === "active" ? "text-emerald-400 text-xs" : "text-gray-600 text-xs"
          }
        >
          {s.status.replace("_", " ")}
        </span>
        <div className="flex gap-2 text-xs">
          {s.status === "needs_grant" && (
            <button onClick={() => setStatus(s.id, "active")} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
              Mark granted
            </button>
          )}
          {s.status === "needs_revoke" && (
            <button onClick={() => setStatus(s.id, "canceled")} className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400">
              Mark revoked
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">Indicator access</h1>
      <p className="text-xs text-gray-500">
        Grant/revoke is manual — add or remove each username on TradingView&apos;s
        invite-only script access list, then mark it here.
      </p>

      {needsGrant.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-yellow-500">Needs access granted ({needsGrant.length})</h2>
          {needsGrant.map((s) => <Row key={s.id} s={s} />)}
        </div>
      )}

      {needsRevoke.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-400">Needs access revoked ({needsRevoke.length})</h2>
          {needsRevoke.map((s) => <Row key={s.id} s={s} />)}
        </div>
      )}

      {needsGrant.length === 0 && needsRevoke.length === 0 && (
        <p className="text-sm text-gray-500">Nothing pending.</p>
      )}

      {rest.length > 0 && (
        <div className="space-y-2 pt-4">
          <h2 className="text-sm font-semibold text-gray-500">History</h2>
          {rest.map((s) => <Row key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}
