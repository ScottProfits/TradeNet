// Tradovate REST API client. Auth is username/password based (not a static
// per-user API key like Alpaca) — see https://api.tradovate.com "Access Tokens".
// TRADOVATE_CID / TRADOVATE_SECRET are our app-level credentials issued by
// Tradovate ("Get An Access Token Using Client Credentials"), required on
// every access token request regardless of which end-user is connecting.
//
// No sandbox is offered — Tradovate's own guidance is to develop against the
// Demo environment (demo.tradovateapi.com), which uses simulated trading
// with real market data.

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

const DEMO_BASE_URL = "https://demo.tradovateapi.com/v1";
const LIVE_BASE_URL = "https://live.tradovateapi.com/v1";

export async function fetchTradovateFills(
  username: string,
  password: string,
  env: "demo" | "live" = "demo",
  accountId?: string
): Promise<TradovateFillsResult> {
  const baseUrl = env === "live" ? LIVE_BASE_URL : DEMO_BASE_URL;
  const cid = process.env.TRADOVATE_CID;
  const sec = process.env.TRADOVATE_SECRET;
  if (!cid || !sec) throw new Error("Tradovate app credentials not configured");

  // 1. Authenticate
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

  // 2. Get this user's accounts
  const accountsRes = await fetch(`${baseUrl}/account/list`, { headers });
  const accounts = await accountsRes.json();
  const account = accountId ? accounts.find((a: { id: number }) => String(a.id) === accountId) : accounts[0];
  if (!account) throw new Error("No Tradovate account found");

  // 3. Get fills for this user (Tradovate has no built-in date-range filter
  // on fill/list — matches the same client-side date filtering approach
  // used for Rithmic).
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

  const accountFills = rawFills.filter((f) => f.accountId === account.id);

  // 4. Resolve contractId -> symbol name (fills don't carry the symbol directly)
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

  const fills: TradovateFill[] = accountFills.map((f) => {
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

  return { fills, userId: authData.userId, loginAt: new Date().toISOString() };
}
