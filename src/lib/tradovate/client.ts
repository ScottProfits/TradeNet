// Tradovate REST API client. Auth is username/password based (not a static
// per-user API key like Alpaca) — see https://api.tradovate.com "Access Tokens".
// TRADOVATE_CID / TRADOVATE_SECRET are our app-level credentials issued by
// Tradovate ("Get An Access Token Using Client Credentials"), required on
// every access token request regardless of which end-user is connecting.
//
// No sandbox is offered — Tradovate's own guidance is to develop against the
// Demo environment (demo.tradovateapi.com), which uses simulated trading
// with real market data.
//
// To avoid the user having to re-enter their username/password every day,
// we store the *access token* (never the username/password) plus its
// expiry, and renew it via GET /auth/renewaccesstoken (Bearer = old token)
// when it's close to expiring — this is the standard bearer-token renewal
// pattern their docs list under Authentication, though the exact renewal
// window (how many times / how long a token stays renewable before a fresh
// username/password login is required again) is an assumption that should
// be confirmed against real usage over time.

export interface TradovateFill {
  symbol: string;
  exchange: string;
  transactionType: "Buy" | "Sell";
  fillPrice: number;
  fillSize: number;
  fillDate: string; // YYYY-MM-DD
  fillTime: string;
  fillId: string;
  accountId: string;
}

export interface TradovateFillsResult {
  fills: TradovateFill[];
  userId: number;
  loginAt: string;
}

export interface TradovateSession {
  accessToken: string;
  expirationTime: string;
  accountId: string;
  userId: number;
}

const DEMO_BASE_URL = "https://demo.tradovateapi.com/v1";
const LIVE_BASE_URL = "https://live.tradovateapi.com/v1";

function baseUrlFor(env: "demo" | "live") {
  return env === "live" ? LIVE_BASE_URL : DEMO_BASE_URL;
}

// Fetches fills + resolves ticker symbols for an already-authenticated session.
async function fetchFillsWithToken(
  baseUrl: string,
  token: string,
  accountId: string
): Promise<TradovateFill[]> {
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  const fillsRes = await fetch(`${baseUrl}/fill/list`, { headers });
  const rawFills: Array<{
    id: number;
    orderId: number;
    contractId: number;
    timestamp: string;
    action: "Buy" | "Sell";
    qty: number;
    price: number;
    accountId: number;
  }> = await fillsRes.json();

  const accountFills = rawFills.filter((f) => String(f.accountId) === accountId);

  // Resolve contractId -> symbol name (fills don't carry the symbol directly)
  const contractIds = [...new Set(accountFills.map((f) => f.contractId))];
  const contractMap = new Map<number, string>();
  await Promise.all(
    contractIds.map(async (id) => {
      const res = await fetch(`${baseUrl}/contract/item?id=${id}`, { headers });
      if (res.ok) {
        const contract = await res.json();
        contractMap.set(id, contract.name ?? String(id));
      }
    })
  );

  return accountFills.map((f) => {
    const ts = new Date(f.timestamp);
    return {
      symbol: contractMap.get(f.contractId) ?? String(f.contractId),
      exchange: "CME", // Tradovate fills don't carry exchange directly on the fill itself
      transactionType: f.action,
      fillPrice: f.price,
      fillSize: f.qty,
      fillDate: ts.toISOString().slice(0, 10),
      fillTime: ts.toISOString().slice(11, 19),
      fillId: String(f.id),
      accountId: String(f.accountId),
    };
  });
}

// Full username/password login — used for the initial Connect flow.
export async function fetchTradovateFills(
  username: string,
  password: string,
  env: "demo" | "live" = "demo",
  accountId?: string
): Promise<TradovateFillsResult & { session: TradovateSession }> {
  const baseUrl = baseUrlFor(env);
  const cid = process.env.TRADOVATE_CID;
  const sec = process.env.TRADOVATE_SECRET;
  if (!cid || !sec) throw new Error("Tradovate app credentials not configured");

  const authRes = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: username,
      password,
      appId: "Ryzr",
      appVersion: "1.0",
      cid: Number(cid),
      sec,
      deviceId: `ryzr-${username}`,
    }),
  });
  const authData = await authRes.json();
  if (!authRes.ok || !authData.accessToken) {
    throw new Error(authData.errorText || "Tradovate login failed");
  }
  const token = authData.accessToken as string;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  const accountsRes = await fetch(`${baseUrl}/account/list`, { headers });
  const accounts = await accountsRes.json();
  const account = accountId ? accounts.find((a: { id: number }) => String(a.id) === accountId) : accounts[0];
  if (!account) throw new Error("No Tradovate account found");

  const fills = await fetchFillsWithToken(baseUrl, token, String(account.id));

  return {
    fills,
    userId: authData.userId,
    loginAt: new Date().toISOString(),
    session: {
      accessToken: token,
      expirationTime: authData.expirationTime,
      accountId: String(account.id),
      userId: authData.userId,
    },
  };
}

// Renews an existing (still-valid) access token without needing the
// username/password again.
export async function renewTradovateToken(
  oldToken: string,
  env: "demo" | "live" = "demo"
): Promise<{ accessToken: string; expirationTime: string }> {
  const baseUrl = baseUrlFor(env);
  const res = await fetch(`${baseUrl}/auth/renewaccesstoken`, {
    headers: { Authorization: `Bearer ${oldToken}`, Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok || !data.accessToken) {
    throw new Error(data.errorText || "Token renewal failed");
  }
  return { accessToken: data.accessToken, expirationTime: data.expirationTime };
}

// Fetches fills using an already-valid or freshly-renewed token — used by
// the scheduled sync job so the user never has to re-enter credentials.
export async function fetchTradovateFillsWithSession(
  accessToken: string,
  accountId: string,
  env: "demo" | "live" = "demo"
): Promise<TradovateFill[]> {
  return fetchFillsWithToken(baseUrlFor(env), accessToken, accountId);
}
