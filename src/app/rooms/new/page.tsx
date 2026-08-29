"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { errorMessage } from "@/lib/apiError";

export default function NewRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, visibility }),
    });
    if (res.ok) {
      const room = await res.json();
      router.push(`/rooms/${room.slug}`);
    } else {
      setError(await errorMessage(res));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">New channel</h1>

      <form onSubmit={create} className="glass-card rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. ES Scalpers"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--green)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Description <span className="text-gray-600 normal-case">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="What's this channel about?"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--green)] resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Visibility</label>
          <div className="flex gap-2">
            {(["public", "unlisted"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`flex-1 text-sm py-2 rounded-lg border capitalize transition-colors ${
                  visibility === v
                    ? "border-[var(--green)] text-white bg-[var(--green)]/10"
                    : "border-[var(--border)] text-gray-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Your channel starts free with a <span className="text-gray-300">#general</span> topic. You can add more topics
          and set a monthly price once payouts are connected.
        </p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="w-full py-2.5 rounded-lg bg-[var(--green)] text-black font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {busy ? "Creating..." : "Create channel"}
        </button>
      </form>
    </div>
  );
}
