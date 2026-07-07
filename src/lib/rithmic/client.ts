// Precompiled from the .proto files (see scripts/build-rithmic-proto.js) so
// this loads via a static import instead of an fs.readFileSync at runtime —
// runtime proto file paths are not reliably included in serverless bundles.
import protoBundle from "./proto-bundle.json";

export interface RithmicFill {
  symbol: string;
  exchange: string;
  transactionType: string;
  fillPrice: number;
  fillSize: number;
  fillDate: string;
  fillTime: string;
  fillId: string;
  accountId: string;
}

export interface RithmicFillsResult {
  fills: RithmicFill[];
  uniqueUserId: string;
  loginAt: string;
}

export async function fetchRithmicFills(
  userId: string,
  password: string,
  systemName: string,
  uri: string,
  accountId?: string,
  startEpoch?: number,
  endEpoch?: number
): Promise<RithmicFillsResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const protobuf = require("protobufjs") as any;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WS = require("ws") as any;

  function loadProto(): any {
    return protobuf.Root.fromJSON(protoBundle);
  }

  function encode(root: any, typeName: string, payload: Record<string, unknown>): Buffer {
    const Type = root.lookupType(typeName);
    return Buffer.from(Type.encode(Type.create(payload)).finish());
  }

  function decode(root: any, typeName: string, buf: Buffer) {
    return root.lookupType(typeName).decode(buf);
  }

  function connect(wsUri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ws = new WS(wsUri, { rejectUnauthorized: false });
      ws.on("open", () => resolve(ws as any));
      ws.on("error", reject);
    });
  }

  function recv(ws: any, timeoutMs = 10000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Rithmic recv timeout")), timeoutMs);
      ws.once("message", (data: Buffer) => { clearTimeout(t); resolve(data); });
    });
  }

  const root = loadProto();
  const ws = await connect(uri);

  ws.send(encode(root, "RequestRithmicSystemInfo", { templateId: 16, userMsg: ["ryzr"] }));
  await recv(ws);

  const RequestLogin = root.lookupType("RequestLogin");
  ws.send(encode(root, "RequestLogin", {
    templateId: 10, templateVersion: "3.9", userMsg: ["ryzr"],
    user: userId, password, appName: "Ryzr", appVersion: "1.0.0",
    systemName, infraType: (RequestLogin as any).SysInfraType?.ORDER_PLANT ?? 3,
  }));

  const loginBuf = await recv(ws);
  const loginResp = decode(root, "ResponseLogin", loginBuf) as any;
  if (loginResp.rpCode?.[0] !== "0") { ws.close(); throw new Error(`Rithmic login failed: ${loginResp.rpCode}`); }

  const uniqueUserId: string = loginResp.uniqueUserId ?? "";
  const loginAt = new Date().toISOString();

  const fcmId: string = loginResp.fcmId ?? "";
  const ibId: string = loginResp.ibId ?? "";

  let resolvedAccountId = accountId;
  if (!resolvedAccountId) {
    ws.send(encode(root, "RequestAccountList", { templateId: 302, userMsg: ["ryzr"], fcmId, ibId }));
    const acctResp = decode(root, "ResponseAccountList", await recv(ws)) as any;
    resolvedAccountId = acctResp.accountId?.[0] ?? "";
  }

  if (!resolvedAccountId) { ws.close(); throw new Error("No account ID found"); }

  ws.send(encode(root, "RequestShowFillHistory", {
    templateId: 307, userMsg: ["ryzr"], fcmId, ibId,
    accountId: resolvedAccountId, indexFormat: "ssboe",
    ...(startEpoch ? { startIndex: startEpoch } : {}),
    ...(endEpoch ? { finishIndex: endEpoch } : {}),
    maxRecordCount: 500,
  }));

  const fills: RithmicFill[] = [];
  const Base = root.lookupType("Base");

  while (true) {
    let buf: Buffer;
    try { buf = await recv(ws, 15000); } catch { break; }

    const base = Base.decode(buf) as any;
    if (base.templateId === 308) {
      const fill = decode(root, "ResponseShowFillHistory", buf) as any;
      if (fill.rpCode?.[0] === "1" || fill.rqHandlerRpCode?.[0] === "1") break;
      if (fill.symbol && fill.fillPrice) {
        fills.push({
          symbol: fill.symbol ?? "", exchange: fill.exchange ?? "",
          transactionType: fill.transactionType ?? "",
          fillPrice: fill.fillPrice ?? 0, fillSize: Number(fill.fillSize ?? 0),
          fillDate: fill.fillDate ?? "", fillTime: fill.fillTime ?? "",
          fillId: fill.fillId ?? "", accountId: fill.accountId ?? resolvedAccountId,
        });
      }
    }
  }

  ws.send(encode(root, "RequestLogout", { templateId: 12, userMsg: ["ryzr"] }));
  ws.close();
  return { fills, uniqueUserId, loginAt };
}
