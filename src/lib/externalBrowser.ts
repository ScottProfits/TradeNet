import { Capacitor } from "@capacitor/core";

// In the iOS app, outside pages (Stripe checkout/payouts, news, profile
// links, X share, ...) open in an in-app Safari View Controller sheet with a
// Done button, so users never leave Ryzr. Builds without the Browser plugin
// (1.0 (4) and earlier) and the website keep their old behaviour.
export function inAppBrowserAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Browser");
}

// Appended to checkout/portal API calls so the server sends Stripe's return
// URL to /checkout-done (a public "tap Done" page) instead of an app page the
// in-app browser isn't signed in to.
export function nativeQuery(): string {
  return inAppBrowserAvailable() ? "?native=1" : "";
}

export async function openExternal(
  url: string,
  opts: { reloadOnClose?: boolean; sameTabOnWeb?: boolean } = {}
): Promise<void> {
  if (inAppBrowserAvailable()) {
    const { Browser } = await import("@capacitor/browser");
    if (opts.reloadOnClose) {
      // After paying / editing payouts, refresh so the new status shows.
      const handle = await Browser.addListener("browserFinished", () => {
        void handle.remove();
        window.location.reload();
      });
    }
    await Browser.open({ url });
    return;
  }
  if (opts.sameTabOnWeb) window.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
}
