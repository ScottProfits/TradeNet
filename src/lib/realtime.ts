// Thin server-side proxy to the Cloudflare Realtime (Calls) SFU.
// The App Secret never reaches the browser — clients POST their SDP to our
// API routes, which forward to Cloudflare and return the answer.

const APP_ID = process.env.CF_REALTIME_APP_ID;
const APP_SECRET = process.env.CF_REALTIME_APP_SECRET;
const BASE = "https://rtc.live.cloudflare.com/v1";

export const DAILY_STREAM_LIMIT_SECONDS = 5700; // 1h35m (90m + 5m grace)
export const STREAM_WARN_AT_SECONDS = 5400; // 90m — client shows "5 min left"

function headers() {
  if (!APP_ID || !APP_SECRET) throw new Error("Cloudflare Realtime not configured");
  return { Authorization: `Bearer ${APP_SECRET}`, "Content-Type": "application/json" };
}

async function cf(path: string, body?: unknown) {
  const res = await fetch(`${BASE}/apps/${APP_ID}${path}`, {
    method: "POST",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cloudflare Realtime ${res.status}: ${JSON.stringify(json)}`);
  return json as Record<string, unknown>;
}

/** Create a new SFU session; returns its id. */
export async function newSession(): Promise<string> {
  const j = await cf(`/sessions/new`);
  return j.sessionId as string;
}

/** Push local tracks (broadcaster) — pass the client's SDP offer. */
export function pushTracks(sessionId: string, offerSdp: string, trackNames: string[]) {
  return cf(`/sessions/${sessionId}/tracks/new`, {
    sessionDescription: { type: "offer", sdp: offerSdp },
    tracks: trackNames.map((mid) => ({ location: "local", mid, trackName: mid })),
  });
}

/** Pull remote tracks (viewer) from the broadcaster's session. */
export function pullTracks(
  viewerSessionId: string,
  offerSdp: string | null,
  from: { sessionId: string; trackNames: string[] }
) {
  return cf(`/sessions/${viewerSessionId}/tracks/new`, {
    ...(offerSdp ? { sessionDescription: { type: "offer", sdp: offerSdp } } : {}),
    tracks: from.trackNames.map((t) => ({
      location: "remote",
      sessionId: from.sessionId,
      trackName: t,
    })),
  });
}

/** Apply a renegotiation answer/offer for an existing session. */
export function renegotiate(sessionId: string, sdp: string, type: "answer" | "offer") {
  return cf(`/sessions/${sessionId}/renegotiate`, {
    sessionDescription: { type, sdp },
  });
}

/** Close a track (used to tear a broadcaster stream down). */
export function closeTracks(sessionId: string, trackNames: string[]) {
  return cf(`/sessions/${sessionId}/tracks/close`, {
    tracks: trackNames.map((t) => ({ trackName: t })),
    force: true,
  });
}

/** Short-lived TURN credentials for the browser's RTCPeerConnection. */
export async function turnCredentials() {
  const keyId = process.env.CF_TURN_KEY_ID;
  const apiToken = process.env.CF_TURN_API_TOKEN;
  if (!keyId || !apiToken) return null;
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 3600 }),
    }
  );
  if (!res.ok) return null;
  const j = await res.json();
  return j.iceServers as RTCIceServer | RTCIceServer[];
}
