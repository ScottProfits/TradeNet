"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, Plus, Bell, Home, Search } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import PostTradeModal from "@/components/feed/PostTradeModal";
import SafeAvatar from "@/components/ui/SafeAvatar";

const TABS = [
  { label: "Home", href: "/feed", icon: "home" },
  { label: "Market", href: "/market", icon: "market" },
  { label: "", href: null, icon: "plus" }, // center post button
  { label: "Alerts", href: "/notifications", icon: "alerts" },
  { label: "Profile", href: null, icon: "profile" }, // dynamic href
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/profile/me`).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.handle) setProfileHandle(d.handle);
      else setProfileHandle(user.username ?? null);
      if (d?.avatar_url) setProfileAvatar(d.avatar_url);
    });
  }, [user?.id, user?.username]);

  const profileHref = profileHandle ? `/profile/${profileHandle}` : "/settings";

  function getTabAtX(clientX: number): number | null {
    const nav = navRef.current;
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    const x = clientX - rect.left;
    const tabW = rect.width / TABS.length;
    const idx = Math.floor(x / tabW);
    return Math.max(0, Math.min(TABS.length - 1, idx));
  }

  function handleTouchMove(e: React.TouchEvent) {
    const idx = getTabAtX(e.touches[0].clientX);
    setHoverIdx(idx);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const idx = hoverIdx;
    setHoverIdx(null);
    if (idx === null) return;
    if (idx === 2) { setShowModal(true); return; }
    if (idx === 4) { router.push(profileHref); return; }
    const href = TABS[idx].href;
    if (href) router.push(href);
  }

  function isActive(idx: number) {
    if (idx === 0) return pathname === "/feed";
    if (idx === 1) return pathname === "/market";
    if (idx === 3) return pathname === "/notifications";
    if (idx === 4) return pathname.startsWith("/profile");
    return false;
  }

  const tabColor = (idx: number) =>
    hoverIdx === idx || isActive(idx) ? "var(--green)" : "rgba(255,255,255,0.35)";

  const tabGlow = (idx: number) =>
    hoverIdx === idx || isActive(idx)
      ? "drop-shadow(0 0 6px rgba(0,200,150,0.8))"
      : "none";

  return (
    <>
      {/* Transparent wrapper — full width but invisible, just for touch area */}
      <div
        ref={navRef}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => setHoverIdx(null)}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-5 lg:hidden"
        style={{ background: "transparent" }}
      >
      {/* Floating pill */}
      <div className="flex items-center w-[92%] max-w-sm" style={{
          background: "rgba(15, 17, 23, 0.55)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "0.5px solid rgba(255,255,255,0.09)",
          borderRadius: 999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        {/* Home */}
        <Link href="/feed" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-all" style={{ color: tabColor(0) }}>
          <Home className="w-5 h-5" style={{ filter: tabGlow(0) }} />
          Home
        </Link>

        {/* Market */}
        <Link href="/market" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-all" style={{ color: tabColor(1) }}>
          <BarChart2 className="w-5 h-5" style={{ filter: tabGlow(1) }} />
          Market
        </Link>

        {/* Center post button */}
        <button onClick={() => setShowModal(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2">
          <span
            className="flex items-center justify-center transition-transform active:scale-95"
            style={{
              opacity: hoverIdx === 2 ? 0.85 : 1,
              width: 36, height: 36,
              borderRadius: 11,
              background: `linear-gradient(135deg, #00C896 0%, #00a87e 100%)`,
              boxShadow: '0 0 14px rgba(0,200,150,0.5)',
            }}
          >
            <Plus className="w-4 h-4 text-black" strokeWidth={2.5} />
          </span>
        </button>

        {/* Alerts */}
        <Link href="/notifications" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-all relative" style={{ color: tabColor(3) }}>
          <Bell className="w-5 h-5" style={{ filter: tabGlow(3) }} />
          Alerts
        </Link>

        {/* Profile */}
        <Link href={profileHref} className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-all" style={{ color: tabColor(4) }}>
          <SafeAvatar
            src={profileAvatar || user?.imageUrl}
            alt="Profile"
            initials={user?.username ?? "?"}
            className={clsx("w-6 h-6 text-[10px]", (hoverIdx === 4 || pathname.startsWith("/profile")) ? "ring-2 ring-[var(--green)]" : "")}
            style={{ filter: tabGlow(4) }}
          />
          Profile
        </Link>
      </div>
      </div>

      <div className="h-24 lg:hidden" />

      {showModal && <PostTradeModal onClose={() => setShowModal(false)} onPosted={() => {}} />}
    </>
  );
}
