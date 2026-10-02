import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";

// Must match (or be below) the project-wide "Upload file size limit" in
// Supabase → Project Settings → Storage, or uploads fail server-side.
export const MAX_UPLOAD_MB = 250;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Supabase recommends resumable (TUS) uploads above ~6MB; its chunk size is fixed at 6MB.
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
const CHUNK_SIZE = 6 * 1024 * 1024;

/** Returns a user-facing error if the file is too large, otherwise null. */
export function checkUploadSize(file: Blob): string | null {
  if (file.size <= MAX_UPLOAD_BYTES) return null;
  const mb = Math.round(file.size / (1024 * 1024));
  const kind = file.type.startsWith("video/") ? "Video" : "File";
  return `${kind} is too large (${mb} MB). Max is ${MAX_UPLOAD_MB} MB.`;
}

/**
 * Uploads to Supabase Storage. Small files use a normal upload; larger ones use a
 * resumable TUS upload so dropped connections retry chunks instead of restarting.
 * Resolves to { error } in the same shape as supabase.storage.upload.
 */
export async function uploadMedia(
  bucket: string,
  path: string,
  file: Blob,
  opts: { contentType?: string; upsert?: boolean; onProgress?: (pct: number) => void } = {}
): Promise<{ error: { message: string } | null }> {
  const sizeError = checkUploadSize(file);
  if (sizeError) return { error: { message: sizeError } };

  const contentType = opts.contentType || file.type || "application/octet-stream";

  if (file.size < RESUMABLE_THRESHOLD) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType, upsert: opts.upsert });
    if (!error) opts.onProgress?.(100);
    return { error: error ? { message: error.message } : null };
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return new Promise((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        "x-upsert": opts.upsert ? "true" : "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: { bucketName: bucket, objectName: path, contentType, cacheControl: "3600" },
      onProgress: (sent, total) => opts.onProgress?.(Math.round((sent / total) * 100)),
      onError: (err) => {
        const body = (err as tus.DetailedError).originalResponse?.getBody();
        let message = err.message;
        try { if (body) message = JSON.parse(body).message || message; } catch {}
        resolve({ error: { message } });
      },
      onSuccess: () => resolve({ error: null }),
    });
    // Resume a previous partial upload of the same file if one exists.
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}
