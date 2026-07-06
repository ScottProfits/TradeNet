"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Plus, Bell, Home } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import PostTradeModal from "@/components/feed/PostTradeModal";
import SafeAvatar from "@/components/ui/SafeAvatar";
import { useNavVisibility } from "@/contexts/NavVisibilityContext";

const PILL_WIDTH = 46;
const TAP_SIZE = 46;
const TAP_OVERHANG = (TAP_SIZE - PILL_WIDTH) / 2;

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { isExploreActive } = useNavVisibility();
  const [exploreRevealed, setExploreRevealed] = useState(false);

  // Hide the nav the moment Explore becomes active; it stays hidden until the user scrolls down
  useEffect(() => {
    if (isExploreActive) setExploreRevealed(false);
  }, [isExploreActive]);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastY && y > 40) {
          setCollapsed(true);
          setExploreRevealed(true);
        } else if (y < lastY) {
          setCollapsed(false);
        }
        lastY = y;
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hiddenForExplore = isExploreActive && !exploreRevealed;

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/profile/me`).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.handle) setProfileHandle(d.handle);
      else setProfileHandle(user.username ?? null);
      if (d?.avatar_url) setProfileAvatar(d.avatar_url);
    });
  }, [user?.id, user?.username]);

  const profileHref = profileHandle ? `/profile/${profileHandle}` : "/settings";

  function isActive(idx: number) {
    if (idx === 0) return pathname === "/feed";
    if (idx === 1) return pathname === "/market";
    if (idx === 3) return pathname === "/notifications";
    if (idx === 4) return pathname.startsWith("/profile");
    return false;
  }

  const tabColor = (idx: number) => (isActive(idx) ? "var(--green)" : "rgba(255,255,255,0.4)");
  const tabGlow = (idx: number) => (isActive(idx) ? "drop-shadow(0 0 6px rgba(0,200,150,0.8))" : "none");

  const tapTargetStyle: React.CSSProperties = {
    width: TAP_SIZE,
    height: TAP_SIZE,
    marginLeft: -TAP_OVERHANG,
    marginRight: -TAP_OVERHANG,
  };

  return (
    <>
      <div
        className="fixed right-0.5 bottom-2 z-50 lg:hidden flex flex-col items-center py-2 gap-1 transition-all duration-300 ease-out"
        style={{
          width: PILL_WIDTH,
          background: "rgba(15, 17, 23, 0.05)",
          borderRadius: 999,
          transform: hiddenForExplore ? "scale(0.6) translateX(20px)" : collapsed ? "scale(0.6)" : "scale(1)",
          transformOrigin: "bottom right",
          opacity: hiddenForExplore ? 0 : collapsed ? 0.55 : 1,
          pointerEvents: hiddenForExplore ? "none" : "auto",
        }}
      >
        {/* Home */}
        <Link href="/feed" aria-label="Home" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <Home className="w-6 h-6" style={{ color: tabColor(0), filter: tabGlow(0) }} />
        </Link>

        {/* Market */}
        <Link href="/market" aria-label="Market" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <BarChart2 className="w-6 h-6" style={{ color: tabColor(1), filter: tabGlow(1) }} />
        </Link>

        {/* Center post button */}
        <button onClick={() => setShowModal(true)} aria-label="Post a trade" className="flex items-center justify-center transition-transform active:scale-90" style={tapTargetStyle}>
          <span
            className="flex items-center justify-center"
            style={{
              width: 30, height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg, #00C896 0%, #00a87e 100%)",
              boxShadow: "0 0 10px rgba(0,200,150,0.5)",
            }}
          >
            <Plus className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
          </span>
        </button>

        {/* Alerts */}
        <Link href="/notifications" aria-label="Alerts" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <Bell className="w-6 h-6" style={{ color: tabColor(3), filter: tabGlow(3) }} />
        </Link>

        {/* Profile */}
        <Link href={profileHref} aria-label="Profile" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <SafeAvatar
            src={profileAvatar || user?.imageUrl}
            alt="Profile"
            initials={user?.username ?? "?"}
            className={clsx("w-6 h-6 text-[10px]", pathname.startsWith("/profile") ? "ring-2 ring-[var(--green)]" : "")}
            style={{ filter: tabGlow(4) }}
          />
        </Link>
      </div>

      {showModal && <PostTradeModal onClose={() => setShowModal(false)} onPosted={() => {}} />}
    </>
  );
}
