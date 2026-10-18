"use client";
import { useEffect } from "react";
import { inAppBrowserAvailable, openExternal } from "@/lib/externalBrowser";

const OWN_HOSTS = new Set(["ryzr.app", "www.ryzr.app"]);

// In the iOS app, any tap on a link to another site (news, profile socials,
// product links, partner links, links inside posts) opens in the in-app
// browser sheet instead of throwing the user out to Safari.
export default function NativeLinkHandler() {
  useEffect(() => {
    if (!inAppBrowserAvailable()) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (OWN_HOSTS.has(url.hostname)) return;
      e.preventDefault();
      void openExternal(url.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
