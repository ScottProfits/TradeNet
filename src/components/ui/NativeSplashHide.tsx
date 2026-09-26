"use client";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// The native launch splash is held (launchAutoHide: false) until the real
// page has mounted, so cold starts show the logo instead of a black gap.
// The timeout is a failsafe so a slow/failed render can never leave the
// splash stuck on screen.
export default function NativeSplashHide() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    const hide = async () => {
      if (cancelled) return;
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide({ fadeOutDuration: 250 });
      } catch {
        /* plugin not in this native build — nothing to hide */
      }
    };
    // Two animation frames = the first real paint has happened, so hiding the
    // splash now reveals content instead of the blank WebView behind it.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => void hide());
    });
    const failsafe = setTimeout(hide, 8000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(failsafe);
    };
  }, []);

  return null;
}
