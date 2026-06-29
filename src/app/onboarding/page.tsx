"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { clsx } from "clsx";
import { Check, ChevronRight } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

const TRADING_STYLES = [
  { value: "Day Trader", emoji: "⚡", desc: "In and out same day" },
  { value: "Swing Trader", emoji: "📈", desc: "Holds for days to weeks" },
  { value: "Scalper", emoji: "🎯", desc: "Fast, high-frequency trades" },
  { value: "Position Trader", emoji: "🏔️", desc: "Weeks to months" },
  { value: "Options Trader", emoji: "💎", desc: "Contracts & derivatives" },
  { value: "Investor", emoji: "🌱", desc: "Long-term growth focus" },
];

interface Suggestion {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
  trading_style: string;
  followers_count: number;
}

export default function OnboardingPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [style, setStyle] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/explore").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.suggested) setSuggestions(d.suggested);
      else if (d?.topTraders) setSuggestions(d.topTraders.slice(0, 5));
    });
  }, []);

  async function saveStyle() {
    if (!style) return;
    setSaving(true);
    // Fetch existing profile to get current handle (required by update API)
    const profile = await fetch("/api/profile/me").then((r) => r.ok ? r.json() : null);
    if (profile?.handle) {
      await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: profile.handle, full_name: profile.full_name ?? "", bio: profile.bio ?? "", brokerage: profile.brokerage ?? "", trading_style: style }),
      });
    }
    setSaving(false);
    setStep(2);
  }

  async function toggleFollow(handle: string) {
    const isFollowing = followed.has(handle);
    setFollowed((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(handle) : next.add(handle);
      return next;
    });
    await fetch("/api/follow", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetHandle: handle }),
    });
  }

  async function finish() {
    router.push("/feed");
  }

  if (!userId) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <VerifiedBadge className="w-8 h-8" />
            <span className="text-2xl font-bold text-white">Ryzr</span>
          </div>
          <p className="text-gray-400 text-sm">Let&apos;s set up your profile</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 justify-center">
          {[1, 2].map((s) => (
            <div key={s} className={clsx("h-1.5 rounded-full transition-all", s === step ? "w-8 bg-[var(--green)]" : s < step ? "w-6 bg-[var(--green)]/40" : "w-6 bg-white/10")} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">What&apos;s your trading style?</h1>
              <p className="text-gray-500 text-sm mt-1">This helps us personalize your experience</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TRADING_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={clsx(
                    "p-4 rounded-xl border text-left transition-all",
                    style === s.value
                      ? "border-[var(--green)] bg-[var(--green)]/10"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-white/20"
                  )}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <p className="font-semibold text-white text-sm mt-2">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  {style === s.value && (
                    <div className="mt-2 flex justify-end">
                      <div className="w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={saveStyle}
              disabled={!style || saving}
              className="w-full py-3 rounded-xl bg-[var(--green)] text-black font-semibold text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {saving ? "Saving..." : "Continue"} {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Follow some traders</h1>
              <p className="text-gray-500 text-sm mt-1">Build your feed by following top traders</p>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-center text-gray-500 text-sm">No suggestions yet — check back soon.</p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                    {s.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar_url} alt={s.handle} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                        {s.handle.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-sm">@{s.handle}</span>
                        {s.verified && <VerifiedBadge className="w-3 h-3" />}
                      </div>
                      <p className="text-xs text-gray-500">{s.trading_style || "Trader"} · {s.followers_count?.toLocaleString() ?? 0} followers</p>
                    </div>
                    <button
                      onClick={() => toggleFollow(s.handle)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0",
                        followed.has(s.handle)
                          ? "bg-white/10 text-gray-300 hover:bg-white/20"
                          : "bg-[var(--green)] text-black hover:bg-[var(--green)]/80"
                      )}
                    >
                      {followed.has(s.handle) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={finish}
              className="w-full py-3 rounded-xl bg-[var(--green)] text-black font-semibold text-sm flex items-center justify-center gap-2"
            >
              {followed.size === 0 ? "Skip for now" : `Continue with ${followed.size} followed`} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
