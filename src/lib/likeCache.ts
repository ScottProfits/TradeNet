const KEY = "ryzr_like_overrides";

function readAll(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getLikeOverride(postId: string): boolean | undefined {
  return readAll()[postId];
}

export function setLikeOverride(postId: string, liked: boolean) {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[postId] = liked;
  sessionStorage.setItem(KEY, JSON.stringify(all));
}

export function clearLikeOverride(postId: string) {
  if (typeof window === "undefined") return;
  const all = readAll();
  delete all[postId];
  sessionStorage.setItem(KEY, JSON.stringify(all));
}
