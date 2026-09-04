# Live streaming (Cloudflare Realtime) — setup

Screen-share-only live streaming inside channels. Broadcast from a desktop
browser, watch anywhere (incl. the iOS app). Sub-second latency via WebRTC.

## 1. Database

Run `supabase-channel-streams-migration.sql` in the Supabase SQL editor.

## 2. Cloudflare

1. Create a free Cloudflare account.
2. Dashboard → **Realtime** → create an app ("ryzr-streams") → copy the
   **App ID** and **App Secret**.
3. Realtime → **TURN** → create a TURN key → copy the **Key ID** and
   **API Token**.

## 3. Environment variables (Vercel, all environments)

```
CF_REALTIME_APP_ID=...
CF_REALTIME_APP_SECRET=...     # secret
CF_TURN_KEY_ID=...
CF_TURN_API_TOKEN=...          # secret
```

Redeploy.

## 4. How it works

- **Broadcast**: owner/mod on a desktop browser sees "Go live — share your
  screen" above the chat. Click → browser's own picker (full screen, window,
  or tab — their choice) + optional mic. Publishes over WebRTC through
  `/api/channels/[id]/stream/start` (server proxies Cloudflare Realtime).
- **Watch**: members see a 🔴 LIVE player at the top of the topic. Gated by
  the same `canParticipate` membership check as chat.
- **Daily cap**: 1h35m of streaming **per user** (total across all their
  channels), 5-minute warning at 90m, auto-ends at 95m. Enforced server-side
  via the heartbeat route + `stream_usage` table.
- **Encoder caps**: 15fps, ~1 Mbps, `contentHint:"text"` — tuned for charts,
  keeps Cloudflare egress near the free 1 TB/mo.
- No Vercel cron needed (Hobby plan) — dead broadcasters are cleaned up
  lazily when a viewer polls stream status.

## Cost

Cloudflare Realtime: $0.05/GB egress, first 1 TB/month free. At the capped
settings that's ~4,000 viewer-hours/month before you pay anything.

## Files

- `src/lib/realtime.ts` — Cloudflare Realtime SFU server proxy
- `src/lib/streamClient.ts` — browser getDisplayMedia + WebRTC glue
- `src/components/rooms/ChannelLive.tsx` — LIVE player + Go Live button
- `src/app/api/channels/[id]/stream/{route,start,heartbeat}.ts`
- `src/app/api/stream/[streamId]/watch/route.ts`
- `src/app/api/stream/ice/route.ts`
