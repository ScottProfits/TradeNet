import Stripe from "stripe";

// Lazily constructed so a missing key never breaks the build or unrelated
// routes — only the billing endpoints that actually touch Stripe fail,
// and only at request time.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // Pin nothing — use the account's default API version.
  _stripe = new Stripe(key);
  return _stripe;
}

/**
 * Proxy so existing `stripe.foo.bar()` call sites keep working while the
 * real client is created on first use.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    const client = getStripe() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Absolute base URL for building Checkout return links. */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.ryzr.app";
}

/** Platform's cut of a room subscription, as a Stripe application_fee_percent. */
export function platformFeePercent(roomFee?: number | null): number {
  const n = typeof roomFee === "number" ? roomFee : 4.5;
  return Math.min(50, Math.max(0, n));
}
