"use client";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

// App Store guideline 3.1.1: paid digital content (paid channels, creator
// products, the indicator) must be sold through Apple In-App Purchase if the
// app can reach it. Until IAP exists, the iOS app hides all of it and it stays
// on the website. Elements marked with the `web-only` class are hidden in the
// app by CSS (html.native-app, set by the inline script in layout.tsx), so
// they never flash on first paint.
export const WEB_ONLY = "web-only";

export function hidesPaidContent(): boolean {
  return Capacitor.isNativePlatform();
}

// False during SSR and the first client render, so it can gate whole pages
// without a hydration mismatch.
export function useHidesPaidContent(): boolean {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    if (!hidesPaidContent()) return;
    document.documentElement.classList.add("native-app");
    setHide(true);
  }, []);
  return hide;
}

export function isPaidRoom(room: { price_cents: number | null }): boolean {
  return !!room.price_cents && room.price_cents > 0;
}

// Owners run their own paid channel in the app; they don't buy anything.
export function paidRoomClass(room: { price_cents: number | null; owner_id?: string }, userId?: string | null): string {
  return isPaidRoom(room) && room.owner_id !== userId ? WEB_ONLY : "";
}

export const NATIVE_APP_CLASS_SCRIPT =
  "try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform())document.documentElement.classList.add('native-app')}catch(e){}";
