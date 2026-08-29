/**
 * Safely turn a failed fetch Response into a short human message.
 * Our API routes return plain-text errors; anything else (an HTML 404/500
 * page, an empty body, a giant blob) collapses to a generic message so we
 * never dump markup into an alert.
 */
export async function errorMessage(res: Response, fallback = "Something went wrong. Please try again."): Promise<string> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/plain") && !ct.includes("application/json")) {
      return res.status === 404 ? "That's not available yet — try again in a moment." : fallback;
    }
    const body = (await res.text()).trim();
    if (!body || body.length > 200 || body.startsWith("<")) return fallback;
    return body;
  } catch {
    return fallback;
  }
}
