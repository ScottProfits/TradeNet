import { registerPlugin, Capacitor } from "@capacitor/core";

interface VideoCapturePluginPlugin {
  captureVideo(): Promise<{ path: string }>;
}

// Native-only plugin (ios/App/App/VideoCapturePlugin.swift) — no web
// implementation, so this only gets called behind an isNativePlatform()
// check. It records through UIImagePickerController at .typeHigh quality,
// instead of the web <input capture> flow, which WebKit silently caps to
// a much lower bitrate/resolution than what photo capture gets.
const VideoCapturePlugin = registerPlugin<VideoCapturePluginPlugin>("VideoCapture");

export function nativeVideoCaptureAvailable() {
  return Capacitor.isNativePlatform();
}

export async function captureNativeVideo(): Promise<File> {
  // A timeout guards against the native side silently never resolving
  // (e.g. no root view controller to present on) — without this, a
  // hung call looks identical to "nothing happens" with no error ever
  // surfacing, which makes it impossible to tell what actually failed.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timed out waiting for the native camera to respond.")), 15000)
  );
  const { path } = await Promise.race([VideoCapturePlugin.captureVideo(), timeout]);
  const src = Capacitor.convertFileSrc(path);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Couldn't read the recorded video (${res.status}).`);
  const blob = await res.blob();
  return new File([blob], `video-${Date.now()}.mov`, { type: blob.type || "video/quicktime" });
}
