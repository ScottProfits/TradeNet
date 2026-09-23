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
        await SplashScreen.hide({ fadeOutDuration: 200 });
      } catch {
        /* plugin not in this native build — nothing to hide */
      }
    };
    void hide();
    const failsafe = setTimeout(hide, 8000);
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, []);

  return null;
}
