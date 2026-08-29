"use client";
import { useEffect, useState, useCallback } from "react";
import BackButton from "@/components/ui/BackButton";
import { timeAgo } from "@/lib/timeAgo";

interface Report {
  id: string;
  reporter_handle: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  content_snapshot: { content: string; deleted_at: string | null } | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/reports");
    if (res.status === 403) { setForbidden(true); return; }
    if (res.ok) setReports(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(id: string, status: string, deleteMessage = false) {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, deleteMessage }),
    });
    load();
  }

  if (forbidden) return <p className="text-gray-500 text-sm text-center pt-20">Not authorized.</p>;

  const open = reports.filter((r) => r.status === "open");
  const done = reports.filter((r) => r.status !== "open");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">Content reports</h1>

      <p className="text-xs text-gray-500">
        {open.length} open. Apple requires objectionable content to be actioned within 24 hours.
      </p>

      {[...open, ...done].map((r) => (
        <div key={r.id} className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {r.target_type} · reported by @{r.reporter_handle} · {timeAgo(r.created_at)}
            </span>
            <span className={r.status === "open" ? "text-yellow-500" : "text-gray-600"}>{r.status}</span>
          </div>
          {r.reason && <p className="text-sm text-gray-300">“{r.reason}”</p>}
          {r.content_snapshot && (
            <p className="text-sm text-gray-400 bg-[var(--bg)] rounded-lg p-2 border border-[var(--border)]">
              {r.content_snapshot.deleted_at ? <em className="text-gray-600">already deleted</em> : r.content_snapshot.content}
            </p>
          )}
          {r.status === "open" && (
            <div className="flex gap-2 text-xs pt-1">
              {r.target_type === "channel_message" && !r.content_snapshot?.deleted_at && (
                <button onClick={() => resolve(r.id, "actioned", true)} className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400">
                  Delete message + action
                </button>
              )}
              <button onClick={() => resolve(r.id, "actioned")} className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300">
                Mark actioned
              </button>
              <button onClick={() => resolve(r.id, "dismissed")} className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400">
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
