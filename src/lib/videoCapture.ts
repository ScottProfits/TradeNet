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
  const { path } = await VideoCapturePlugin.captureVideo();
  const src = Capacitor.convertFileSrc(path);
  const res = await fetch(src);
  const blob = await res.blob();
  return new File([blob], `video-${Date.now()}.mov`, { type: blob.type || "video/quicktime" });
}
