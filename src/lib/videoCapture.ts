import { registerPlugin, Capacitor } from "@capacitor/core";

interface VideoCapturePluginPlugin {
  captureVideo(): Promise<{ path: string }>;
  readVideoChunk(opts: { path: string; offset: number; length: number }): Promise<{ data: string; size: number; bytes: number }>;
  deleteVideo(opts: { path: string }): Promise<void>;
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

const CHUNK_BYTES = 3 * 1024 * 1024; // multiple of 3 → clean base64 per chunk

// The app's WebView loads https://www.ryzr.app, which can't serve local
// files (WKWebView can't intercept https), so read the recorded file from
// the native side in base64 chunks and rebuild it here.
export async function captureNativeVideo(): Promise<File> {
  // No client-side timeout: the user may legitimately record for a while.
  // Hangs/cancels are detected natively (dismissal watchdog).
  const { path } = await VideoCapturePlugin.captureVideo();

  const parts: Uint8Array[] = [];
  let offset = 0;
  let size = Infinity;
  try {
    while (offset < size) {
      const r = await VideoCapturePlugin.readVideoChunk({ path, offset, length: CHUNK_BYTES });
      size = r.size;
      if (!r.bytes) break;
      const bin = atob(r.data);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      parts.push(arr);
      offset += r.bytes;
    }
  } finally {
    void VideoCapturePlugin.deleteVideo({ path }).catch(() => {});
  }
  if (!parts.length) throw new Error("The recorded video was empty.");
  return new File(parts as BlobPart[], `video-${Date.now()}.mov`, { type: "video/quicktime" });
}
