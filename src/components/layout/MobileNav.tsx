"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, Plus, Bell, Home } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import PostTradeModal from "@/components/feed/PostTradeModal";
import SafeAvatar from "@/components/ui/SafeAvatar";
import { useNavVisibility } from "@/contexts/NavVisibilityContext";

const PILL_HEIGHT = 46;
const TAP_SIZE = 52;
const TAP_OVERHANG = (TAP_SIZE - PILL_HEIGHT) / 2;

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { isExploreActive } = useNavVisibility();
  const [exploreRevealed, setExploreRevealed] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    function load() {
      Promise.all([
        fetch("/api/messages?unread=1").then((r) => (r.ok ? r.json() : { count: 0 })),
        fetch("/api/notifications").then((r) => (r.ok ? r.json() : [])),
      ]).then(([dms, notifs]) => {
        const unreadNotifs = Array.isArray(notifs) ? notifs.filter((n: { read: boolean }) => !n.read).length : 0;
        setHasUnread(dms.count > 0 || unreadNotifs > 0);
      });
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
        className="fixed left-1/2 bottom-2 z-50 lg:hidden flex flex-row items-center px-2 gap-1"
        style={{
          height: PILL_HEIGHT,
          background: "rgba(15, 17, 23, 0.38)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 999,
          transform: hiddenForExplore
            ? "translateX(-50%) scale(0.6) translateY(20px)"
            : collapsed
            ? "translateX(-50%) scale(0.6)"
            : "translateX(-50%) scale(1)",
          transformOrigin: "bottom center",
          opacity: hiddenForExplore ? 0 : collapsed ? 0.55 : 1,
          pointerEvents: hiddenForExplore ? "none" : "auto",
          transition: "transform 300ms ease-out, opacity 300ms ease-out",
          WebkitTransform: hiddenForExplore
            ? "translateX(-50%) scale(0.6) translateY(20px)"
            : collapsed
            ? "translateX(-50%) scale(0.6)"
            : "translateX(-50%) scale(1)",
          willChange: "transform, opacity",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {/* Home */}
        <Link href="/feed" aria-label="Home" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <Home className="w-[30px] h-[30px]" style={{ color: tabColor(0), filter: tabGlow(0) }} />
        </Link>

        {/* Market */}
        <Link href="/market" aria-label="Market" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <BarChart2 className="w-[30px] h-[30px]" style={{ color: tabColor(1), filter: tabGlow(1) }} />
        </Link>

        {/* Center post button */}
        <button onClick={() => setShowModal(true)} aria-label="Post a trade" className="flex items-center justify-center transition-transform active:scale-90" style={tapTargetStyle}>
          <span
            className="flex items-center justify-center"
            style={{
              width: 31, height: 31,
              borderRadius: 10,
              background: "linear-gradient(135deg, #00C896 0%, #00a87e 100%)",
              boxShadow: "0 0 10px rgba(0,200,150,0.5)",
            }}
          >
            <Plus className="w-4 h-4 text-black" strokeWidth={2.5} />
          </span>
        </button>

        {/* Alerts */}
        <Link href="/notifications" aria-label="Alerts" className="relative flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <Bell className="w-[30px] h-[30px]" style={{ color: tabColor(3), filter: tabGlow(3) }} />
          {hasUnread && (
            <span
              className="absolute rounded-full"
              style={{
                top: TAP_SIZE / 2 - 14,
                right: TAP_SIZE / 2 - 14,
                width: 9,
                height: 9,
                background: "var(--green)",
                boxShadow: "0 0 6px rgba(0,200,150,0.8)",
              }}
            />
          )}
        </Link>

        {/* Profile */}
        <Link href={profileHref} aria-label="Profile" className="flex items-center justify-center transition-all active:scale-90" style={tapTargetStyle}>
          <SafeAvatar
            src={profileAvatar || user?.imageUrl}
            alt="Profile"
            initials={user?.username ?? "?"}
            className={clsx("w-[30px] h-[30px] text-xs", pathname.startsWith("/profile") ? "ring-2 ring-[var(--green)]" : "")}
            style={{ filter: tabGlow(4) }}
          />
        </Link>
      </div>

      {showModal && (
        <PostTradeModal
          onClose={() => setShowModal(false)}
          onPosted={() => {
            window.dispatchEvent(new Event("ryzr:feed-refresh"));
            if (pathname !== "/feed") router.push("/feed");
          }}
        />
      )}
    </>
  );
}
