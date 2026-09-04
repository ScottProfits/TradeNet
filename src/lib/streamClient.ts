// Browser-side WebRTC glue for channel live streaming. All SFU calls go
// through our own API (which holds the Cloudflare secret); this module only
// does getDisplayMedia + RTCPeerConnection wiring.

// Screen-share is a static-ish trading screen: cap it hard for cost + clarity.
const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: { frameRate: { ideal: 15, max: 15 } },
  audio: true, // tab/system audio when the browser + OS allow it
};

export interface Broadcast {
  pc: RTCPeerConnection;
  stream: MediaStream;
  streamId: string;
  stop: () => void;
}

async function iceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch("/api/stream/ice");
    if (!r.ok) return [{ urls: "stun:stun.cloudflare.com:3478" }];
    const j = await r.json();
    return Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
  } catch {
    return [{ urls: "stun:stun.cloudflare.com:3478" }];
  }
}

/** Capture the screen (+ mic) and publish it as a live stream for a channel. */
export async function startBroadcast(
  channelId: string,
  opts: { title?: string; withMic?: boolean }
): Promise<Broadcast> {
  const display = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
  const videoTrack = display.getVideoTracks()[0];
  // Sharpness over smoothness for text/charts.
  try {
    (videoTrack as MediaStreamTrack & { contentHint?: string }).contentHint = "text";
  } catch {}

  const outbound = new MediaStream([videoTrack]);
  let micTrack: MediaStreamTrack | undefined;
  if (opts.withMic) {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micTrack = mic.getAudioTracks()[0];
      if (micTrack) outbound.addTrack(micTrack);
    } catch {}
  } else {
    const sysAudio = display.getAudioTracks()[0];
    if (sysAudio) outbound.addTrack(sysAudio);
  }

  const pc = new RTCPeerConnection({ iceServers: await iceServers(), bundlePolicy: "max-bundle" });
  const vSender = pc.addTransceiver(videoTrack, { direction: "sendonly" }).sender;
  try {
    const p = vSender.getParameters();
    p.encodings = [{ maxBitrate: 1_000_000, maxFramerate: 15 }];
    await vSender.setParameters(p);
  } catch {}
  const audioOut = outbound.getAudioTracks()[0];
  if (audioOut) pc.addTransceiver(audioOut, { direction: "sendonly" });

  await pc.setLocalDescription(await pc.createOffer());
  await waitForIce(pc);

  const transceivers = pc.getTransceivers();
  const videoMid = transceivers.find((t) => t.sender.track?.kind === "video")?.mid ?? undefined;
  const audioMid = transceivers.find((t) => t.sender.track?.kind === "audio")?.mid ?? undefined;

  const res = await fetch(`/api/channels/${channelId}/stream/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offer: pc.localDescription?.sdp,
      videoMid,
      audioMid,
      title: opts.title,
      day: localDay(),
    }),
  });
  if (!res.ok) {
    pc.close();
    outbound.getTracks().forEach((t) => t.stop());
    throw new Error(await res.text());
  }
  const { streamId, answer } = await res.json();
  await pc.setRemoteDescription({ type: "answer", sdp: answer });

  const cleanup = () => {
    pc.close();
    display.getTracks().forEach((t) => t.stop());
    micTrack?.stop();
  };
  // If the user hits the browser's native "Stop sharing", end the stream.
  videoTrack.addEventListener("ended", () => {
    fetch(`/api/channels/${channelId}/stream`, { method: "DELETE" }).catch(() => {});
    cleanup();
  });

  return { pc, stream: outbound, streamId, stop: cleanup };
}

/** Subscribe to a live channel stream and get a MediaStream to play. */
export async function watchStream(streamId: string): Promise<{ pc: RTCPeerConnection; stream: MediaStream }> {
  const start = await fetch(`/api/stream/${streamId}/watch`, { method: "POST" });
  if (!start.ok) throw new Error(await start.text());
  const { viewerSessionId, offer } = await start.json();

  const pc = new RTCPeerConnection({ iceServers: await iceServers(), bundlePolicy: "max-bundle" });
  const remote = new MediaStream();
  pc.addEventListener("track", (e) => remote.addTrack(e.track));

  await pc.setRemoteDescription({ type: "offer", sdp: offer });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitForIce(pc);

  const done = await fetch(`/api/stream/${streamId}/watch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ viewerSessionId, answer: pc.localDescription?.sdp }),
  });
  if (!done.ok) {
    pc.close();
    throw new Error(await done.text());
  }
  return { pc, stream: remote };
}

export function localDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, 2000); // don't block forever on trickle
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        resolve();
      }
    });
  });
}
