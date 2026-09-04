// Shared voice-recording helpers.

export function extFor(mime: string) {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  return "m4a";
}

export function pickMime() {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
    (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
  );
}

// The native app (Capacitor) handles the mic prompt itself — once, via iOS.
// A plain iOS home-screen web view (standalone Safari PWA) crashes on
// MediaRecorder, so block voice there; Safari tabs are fine.
export function voiceRecordingSupported() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = nav.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return !(standalone && isIOS);
}

export function micErrorMessage(err: unknown) {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is off. Turn it on in Settings › Ryzr › Microphone, then try again.";
  if (name === "NotFoundError") return "No microphone found.";
  return "Couldn't start recording — try again.";
}

export const VOICE_MAX_SECONDS = 25;
