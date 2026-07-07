import jwt from "jsonwebtoken";
import http2 from "node:http2";

let cachedToken: { token: string; issuedAt: number } | null = null;

function getProviderToken(): string | null {
  const key = process.env.APNS_PRIVATE_KEY;
  const keyId = process.env.APNS_KEYS_ID ?? process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) return null;

  const now = Math.floor(Date.now() / 1000);
  // APNs tokens are valid up to 1 hour — reuse for 50 minutes to be safe
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60) return cachedToken.token;

  const token = jwt.sign({ iss: teamId, iat: now }, key.replace(/\\n/g, "\n"), {
    algorithm: "ES256",
    header: { alg: "ES256", kid: keyId },
  });
  cachedToken = { token, issuedAt: now };
  return token;
}

export async function sendApnsNotification(
  deviceToken: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; shouldRemove: boolean; status?: number; body?: string; error?: string }> {
  const providerToken = getProviderToken();
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!providerToken) return { ok: false, shouldRemove: false, error: "Missing APNS_KEY_ID/APNS_TEAM_ID/APNS_PRIVATE_KEY" };
  if (!bundleId) return { ok: false, shouldRemove: false, error: "Missing APNS_BUNDLE_ID" };

  const host =
    process.env.APNS_USE_SANDBOX === "true" ? "api.sandbox.push.apple.com" : "api.push.apple.com";

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);
    client.on("error", (err) => resolve({ ok: false, shouldRemove: false, error: `Connection error: ${err.message}` }));

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    req.setEncoding("utf8");
    let status = 0;
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      client.close();
      const removable = status === 410 || (status === 400 && /BadDeviceToken|Unregistered/.test(body));
      resolve({ ok: status === 200, shouldRemove: removable, status, body: body || undefined });
    });

    req.end(
      JSON.stringify({
        aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
        url: payload.url ?? "/",
      })
    );
  });
}
