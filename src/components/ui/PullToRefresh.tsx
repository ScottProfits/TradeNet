"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const PULL_THRESHOLD = 95;
const MAX_PULL = 140;
const DRAG_RESISTANCE = 0.35;
const DEAD_ZONE = 12;

export default function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown>; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reset = useCallback(() => {
    startY.current = null;
    pulling.current = false;
    setDistance(0);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || startY.current === null || refreshing) return;
      const rawDelta = e.touches[0].clientY - startY.current - DEAD_ZONE;
      if (rawDelta <= 0) { setDistance(0); return; }
      if (window.scrollY > 0) { reset(); return; }
      e.preventDefault();
      setDistance(Math.min(rawDelta * DRAG_RESISTANCE, MAX_PULL));
    }

    async function onTouchEnd() {
      if (!pulling.current) return;
      if (distance >= PULL_THRESHOLD && !refreshing) {
        setRefreshing(true);
        setDistance(PULL_THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          reset();
        }
      } else {
        reset();
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", reset);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distance, refreshing, onRefresh, reset]);

  const progress = Math.min(distance / PULL_THRESHOLD, 1);
  const indicatorHeight = refreshing ? PULL_THRESHOLD : distance;

  return (
    <div ref={containerRef}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: indicatorHeight,
          opacity: progress,
          transition: pulling.current ? "none" : "height 0.2s ease, opacity 0.2s ease",
        }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-[var(--green)] animate-spin" />
        ) : (
          <ArrowDown
            className="w-5 h-5 text-[var(--green)] transition-transform duration-150"
            style={{ transform: `rotate(${progress * 180}deg)` }}
          />
        )}
      </div>
      {children}
    </div>
  );
}
