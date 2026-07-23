// Precompiled from the .proto files (see scripts/build-rithmic-proto.js) so
// this loads via a static import instead of an fs.readFileSync at runtime —
// runtime proto file paths are not reliably included in serverless bundles.
import protoBundle from "./proto-bundle.json";

export const RITHMIC_URI = "wss://rituz00100.rithmic.com:443";
export const RITHMIC_SYSTEM = "Rithmic Test";

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

export interface RithmicAgreement {
  agreementId: string;
  title: string;
  // Rendered HTML when Rithmic provides it, otherwise plain text — always
  // shown to the user verbatim so they're accepting what Rithmic actually sent.
  html: string;
  isHtml: boolean;
}

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

function recv(ws: any, step: string, timeoutMs = 10000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(t);
      ws.removeListener("message", onMessage);
      ws.removeListener("close", onClose);
      ws.removeListener("error", onError);
    };
    const t = setTimeout(() => { cleanup(); reject(new Error(`Rithmic timeout waiting for response to ${step}`)); }, timeoutMs);
    const onMessage = (data: Buffer) => { cleanup(); resolve(data); };
    const onClose = (code: number, reason: Buffer) => { cleanup(); reject(new Error(`Rithmic connection closed while waiting for ${step} (code ${code}${reason?.length ? `: ${reason}` : ""})`)); };
    const onError = (err: Error) => { cleanup(); reject(new Error(`Rithmic connection error while waiting for ${step}: ${err.message}`)); };
    ws.once("message", onMessage);
    ws.once("close", onClose);
    ws.once("error", onError);
  });
}

// Shared login handshake — every plant (order, repository, etc.) requires its
// own connection + login using the same credentials but a different infra_type.
async function loginToPlant(
  root: any,
  uri: string,
  systemName: string,
  userId: string,
  password: string,
  infraType: number
): Promise<{ ws: any; fcmId: string; ibId: string; uniqueUserId: string }> {
  const ws = await connect(uri);
  ws.send(encode(root, "RequestLogin", {
    templateId: 10, templateVersion: "3.9", userMsg: ["ryzr"],
    user: userId, password, appName: "Ryzr", appVersion: "1.0.0",
    systemName, infraType,
  }));

  const loginResp = decode(root, "ResponseLogin", await recv(ws, "login")) as any;
  if (loginResp.rpCode?.[0] !== "0") { ws.close(); throw new Error(`Rithmic login failed: ${loginResp.rpCode}`); }

  return {
    ws,
    fcmId: loginResp.fcmId ?? "",
    ibId: loginResp.ibId ?? "",
    uniqueUserId: loginResp.uniqueUserId ?? "",
  };
}

// Full username/password login — used for the initial Connect flow.
export async function fetchRithmicFills(
  userId: string,
  password: string,
  systemName: string,
  uri: string,
  accountId?: string,
  startEpoch?: number,
  endEpoch?: number
): Promise<RithmicFillsResult> {
  const root = loadProto();

  // Rithmic closes the connection a second or two after answering a system
  // list request — per Rithmic support, this is expected. We reconnect and
  // log in immediately on the fresh connection using the system name.
  const infoWs = await connect(uri);
  infoWs.send(encode(root, "RequestRithmicSystemInfo", { templateId: 16, userMsg: ["ryzr"] }));
  const sysInfoBuf = await recv(infoWs, "system info");
  const sysInfoResp = decode(root, "ResponseRithmicSystemInfo", sysInfoBuf) as any;
  console.log("Rithmic available systems:", sysInfoResp.systemName ?? []);
  infoWs.close();

  const RequestLogin = root.lookupType("RequestLogin");
  const { ws, fcmId, ibId, uniqueUserId } = await loginToPlant(
    root, uri, systemName, userId, password,
    (RequestLogin as any).SysInfraType?.ORDER_PLANT ?? 3
  );
  const loginAt = new Date().toISOString();

  let resolvedAccountId = accountId;
  if (!resolvedAccountId) {
    ws.send(encode(root, "RequestAccountList", { templateId: 302, userMsg: ["ryzr"], fcmId, ibId }));
    const acctResp = decode(root, "ResponseAccountList", await recv(ws, "account list")) as any;
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
    try { buf = await recv(ws, "fill history", 15000); } catch { break; }

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

// Agreements (market data / exchange licensing agreements) live on the
// REPOSITORY_PLANT, a separate login from the ORDER_PLANT used for fills.
// Rithmic requires these accepted before an account can trade/pull data
// through the API — see request_list_unaccepted_agreements.proto and
// request_accept_agreement.proto in the R|API+ SDK.
export async function listUnacceptedRithmicAgreements(
  userId: string,
  password: string,
  systemName: string,
  uri: string
): Promise<RithmicAgreement[]> {
  const root = loadProto();
  const REPOSITORY_PLANT = 5;
  const { ws } = await loginToPlant(root, uri, systemName, userId, password, REPOSITORY_PLANT);

  ws.send(encode(root, "RequestListUnacceptedAgreements", { templateId: 500, userMsg: ["ryzr"] }));

  const Base = root.lookupType("Base");
  const pendingIds: Array<{ agreementId: string; title: string }> = [];

  // Rithmic streams one ResponseListUnacceptedAgreements message per pending
  // agreement, ending either with an empty/terminal message or by going quiet.
  while (true) {
    let buf: Buffer;
    try { buf = await recv(ws, "list unaccepted agreements", 8000); } catch { break; }
    const base = Base.decode(buf) as any;
    if (base.templateId !== 501) continue;
    const resp = decode(root, "ResponseListUnacceptedAgreements", buf) as any;
    if (!resp.agreementId) break;
    pendingIds.push({ agreementId: resp.agreementId, title: resp.agreementTitle ?? resp.agreementId });
  }

  // Fetch the actual agreement text for each pending agreement so the user
  // can read exactly what they're accepting before we ever submit acceptance.
  const agreements: RithmicAgreement[] = [];
  for (const { agreementId, title } of pendingIds) {
    ws.send(encode(root, "RequestShowAgreement", { templateId: 506, userMsg: ["ryzr"], agreementId }));
    const showResp = decode(root, "ResponseShowAgreement", await recv(ws, "show agreement")) as any;
    const htmlBuf: Buffer | undefined = showResp.agreementHtml;
    const textBuf: Buffer | undefined = showResp.agreement;
    agreements.push({
      agreementId,
      title: showResp.agreementTitle ?? title,
      html: (htmlBuf ?? textBuf)?.toString("utf8") ?? "",
      isHtml: !!htmlBuf,
    });
  }

  ws.send(encode(root, "RequestLogout", { templateId: 12, userMsg: ["ryzr"] }));
  ws.close();
  return agreements;
}

export async function acceptRithmicAgreements(
  userId: string,
  password: string,
  systemName: string,
  uri: string,
  agreementIds: string[],
  marketDataUsageCapacity: "Professional" | "Non-Professional"
): Promise<void> {
  const root = loadProto();
  const REPOSITORY_PLANT = 5;
  const { ws } = await loginToPlant(root, uri, systemName, userId, password, REPOSITORY_PLANT);

  for (const agreementId of agreementIds) {
    ws.send(encode(root, "RequestAcceptAgreement", {
      templateId: 504, userMsg: ["ryzr"],
      agreementId, marketDataUsageCapacity,
    }));
    const resp = decode(root, "ResponseAcceptAgreement", await recv(ws, `accept agreement ${agreementId}`)) as any;
    if (resp.rpCode?.[0] && resp.rpCode[0] !== "0") {
      ws.close();
      throw new Error(`Failed to accept agreement ${agreementId}: ${resp.rpCode}`);
    }
  }

  ws.send(encode(root, "RequestLogout", { templateId: 12, userMsg: ["ryzr"] }));
  ws.close();
}
