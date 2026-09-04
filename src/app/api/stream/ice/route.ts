import { auth } from "@clerk/nextjs/server";
import { turnCredentials } from "@/lib/realtime";

// GET /api/stream/ice — short-lived ICE/TURN servers for a browser
// RTCPeerConnection. Falls back to STUN-only if TURN isn't configured.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const turn = await turnCredentials().catch(() => null);
  if (turn) return Response.json({ iceServers: turn });
  return Response.json({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
}
