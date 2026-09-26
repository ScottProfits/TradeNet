"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

// Full-screen agreement shown once to every signed-in user (new and existing)
// before they can use the app: no objectionable content / abusive users.
// Fails open — if the column isn't migrated yet or a request errors, the
// gate never blocks anyone (only an explicit `null` acceptance triggers it).
const SKIP = ["/terms", "/privacy", "/support", "/sign-in", "/sign-up"];
const LOCAL_KEY = "ryzr_terms_accepted";

export default function TermsGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const [needs, setNeeds] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) { setNeeds(false); return; }
    try { if (localStorage.getItem(LOCAL_KEY)) return; } catch { /* storage blocked */ }
    fetch("/api/profile/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.terms_accepted_at === null) setNeeds(true); })
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  if (!needs || SKIP.some((p) => pathname.startsWith(p))) return null;

  async function accept() {
    setSaving(true);
    try { await fetch("/api/terms/accept", { method: "POST" }); } catch { /* fail open */ }
    try { localStorage.setItem(LOCAL_KEY, "1"); } catch { /* ignore */ }
    setNeeds(false);
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Before you continue</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Ryzr has <span className="text-white font-semibold">zero tolerance</span> for objectionable content and abusive
          users — harassment, hate, threats, explicit material, scams, or spam. You can report or block anyone, and we act
          on reports within 24 hours, including banning accounts.
        </p>
        <label className="flex items-start gap-2.5 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--green)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="underline text-[var(--green)]">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="underline text-[var(--green)]">Privacy Policy</Link>.
          </span>
        </label>
        <button
          onClick={accept}
          disabled={!checked || saving}
          className="w-full py-3 rounded-xl bg-[var(--green)] text-black font-bold disabled:opacity-40"
        >
          {saving ? "Saving..." : "Agree & continue"}
        </button>
      </div>
    </div>
  );
}
