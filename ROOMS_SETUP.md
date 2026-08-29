# Premium chat (Rooms) — setup

## 1. Database

Run in the Supabase SQL editor, in order:

1. `supabase-rooms-migration.sql`
2. `supabase-rooms-billing-migration.sql`

## 2. Environment variables

Add to `.env.local` (and Vercel):

```
NEXT_PUBLIC_APP_URL=https://www.ryzr.app        # used for Stripe return URLs
STRIPE_SECRET_KEY=sk_live_...                    # or sk_test_... in dev
STRIPE_WEBHOOK_SECRET=whsec_...                  # from the webhook endpoint below
```

## 3. Stripe dashboard

- **Enable Connect** (Platform / Express accounts). Set the platform name/branding
  and the Express onboarding redirect domains to `ryzr.app`.
- **Webhook endpoint** → `https://www.ryzr.app/api/webhooks/stripe`, events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `account.updated`  (listen "on Connected accounts" too)
  Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Billing portal**: Settings → Billing → Customer portal → activate, allow
  "cancel subscription".

Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
and use the secret it prints.

## 4. How it works

- Any **verified** trader creates a room at `/rooms/new` (free, one `#general`
  channel). They add channels and can set a monthly price in **Manage**.
- To charge, the owner connects payouts at `/settings/earnings` (Stripe Express
  onboarding). Platform fee is **4.5% per transaction** (`rooms.platform_fee_percent`,
  applied via `application_fee_percent` on a destination charge).
- Members subscribe via **web Stripe Checkout only**. The `room_members` row is
  created/updated by the webhook — never trust the client for entitlement.
- iOS: the app reads membership and shows content, but the subscribe button just
  opens the same web checkout. No Apple IAP. Keep pricing/CTAs out of any
  iOS-specific screen if Apple pushes back (see the App Store notes).

## 5. Trust & safety (required before App Store submission)

- Block: `/api/blocks`. Report: `/api/reports` (in-room Flag icon).
- Admin review queue: `/admin/reports` (+ `/api/admin/reports`). Action reports
  within 24h.
- Still TODO: a EULA with a no-objectionable-content clause linked from sign-up
  and the room composer.
