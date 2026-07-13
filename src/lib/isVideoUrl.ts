export function isVideoUrl(url: string | null | undefined): boolean {
  return !!url && /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
}
