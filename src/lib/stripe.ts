import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

// Pin nothing — use the account's default API version so we don't have to
// chase Stripe's dated releases. All calls here are stable, long-lived APIs.
export const stripe = new Stripe(key);

/** Absolute base URL for building Checkout return links. */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.ryzr.app"
  );
}

/** Platform's cut of a room subscription, as a Stripe application_fee_percent. */
export function platformFeePercent(roomFee?: number | null): number {
  const n = typeof roomFee === "number" ? roomFee : 4.5;
  return Math.min(50, Math.max(0, n));
}
