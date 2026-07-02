"use server";
import * as protobuf from "protobufjs";
import WebSocket from "ws";
import path from "path";

const PROTO_DIR = path.join(process.cwd(), "src/lib/rithmic/proto");

export interface RithmicFill {
  symbol: string;
  exchange: string;
  transactionType: string; // BUY | SELL
  fillPrice: number;
  fillSize: number;
  fillDate: string;
  fillTime: string;
  fillId: string;
  accountId: string;
}

function loadProto(): protobuf.Root {
  const root = new protobuf.Root();
  const files = [
    "base",
    "request_heartbeat",
    "response_heartbeat",
    "request_rithmic_system_info",
    "response_rithmic_system_info",
    "request_login",
    "response_login",
    "request_logout",
    "response_logout",
    "request_account_list",
    "response_account_list",
    "request_login_info",
    "response_login_info",
    "request_show_fill_history",
    "response_show_fill_history",
  ];
  for (const f of files) {
    root.loadSync(path.join(PROTO_DIR, `${f}.proto`));
  }
  return root;
}

function encode(
  root: protobuf.Root,
  typeName: string,
  payload: Record<string, unknown>
): Buffer {
  const Type = root.lookupType(typeName);
  const msg = Type.create(payload);
  return Buffer.from(Type.encode(msg).finish());
}

function decode(root: protobuf.Root, typeName: string, buf: Buffer) {
  return root.lookupType(typeName).decode(buf);
}

async function connect(uri: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(uri, { rejectUnauthorized: false });
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

async function recv(ws: WebSocket, timeoutMs = 10000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Rithmic recv timeout")), timeoutMs);
    ws.once("message", (data) => {
      clearTimeout(t);
      resolve(data as Buffer);
    });
  });
}

export async function fetchRithmicFills(
  userId: string,
  password: string,
  systemName: string,
  uri: string,
  accountId?: string,
  startEpoch?: number,
  endEpoch?: number
): Promise<RithmicFill[]> {
  const root = loadProto();
  const ws = await connect(uri);

  // 1. Get system info
  ws.send(encode(root, "RequestRithmicSystemInfo", { templateId: 16, userMsg: ["ryzr"] }));
  await recv(ws);

  // 2. Login to ORDER_PLANT (infra type 3) for fill history
  const RequestLogin = root.lookupType("RequestLogin");
  ws.send(
    encode(root, "RequestLogin", {
      templateId: 10,
      templateVersion: "3.9",
      userMsg: ["ryzr"],
      user: userId,
      password,
      appName: "Ryzr",
      appVersion: "1.0.0",
      systemName,
      infraType: (RequestLogin as any).SysInfraType?.ORDER_PLANT ?? 3,
    })
  );

  const loginBuf = await recv(ws);
  const loginResp = decode(root, "ResponseLogin", loginBuf) as any;
  if (loginResp.rpCode?.[0] !== "0") {
    ws.close();
    throw new Error(`Rithmic login failed: ${loginResp.rpCode}`);
  }

  const fcmId: string = loginResp.fcmId ?? "";
  const ibId: string = loginResp.ibId ?? "";

  // 3. Get account list if accountId not provided
  let resolvedAccountId = accountId;
  if (!resolvedAccountId) {
    ws.send(
      encode(root, "RequestAccountList", {
        templateId: 302,
        userMsg: ["ryzr"],
        fcmId,
        ibId,
      })
    );
    const acctBuf = await recv(ws);
    const acctResp = decode(root, "ResponseAccountList", acctBuf) as any;
    resolvedAccountId = acctResp.accountId?.[0] ?? "";
  }

  if (!resolvedAccountId) {
    ws.close();
    throw new Error("No account ID found");
  }

  // 4. Request fill history
  ws.send(
    encode(root, "RequestShowFillHistory", {
      templateId: 307,
      userMsg: ["ryzr"],
      fcmId,
      ibId,
      accountId: resolvedAccountId,
      indexFormat: "ssboe",
      ...(startEpoch ? { startIndex: startEpoch } : {}),
      ...(endEpoch ? { finishIndex: endEpoch } : {}),
      maxRecordCount: 500,
    })
  );

  // 5. Collect fill responses until rp_code signals end
  const fills: RithmicFill[] = [];
  const Base = root.lookupType("Base");

  while (true) {
    let buf: Buffer;
    try {
      buf = await recv(ws, 15000);
    } catch {
      break;
    }

    const base = Base.decode(buf) as any;

    if (base.templateId === 308) {
      // ResponseShowFillHistory
      const fill = decode(root, "ResponseShowFillHistory", buf) as any;

      // rp_code "0" = data row, "1" = end-of-data
      if (fill.rpCode?.[0] === "1" || fill.rqHandlerRpCode?.[0] === "1") break;

      if (fill.symbol && fill.fillPrice) {
        fills.push({
          symbol: fill.symbol ?? "",
          exchange: fill.exchange ?? "",
          transactionType: fill.transactionType ?? "",
          fillPrice: fill.fillPrice ?? 0,
          fillSize: Number(fill.fillSize ?? 0),
          fillDate: fill.fillDate ?? "",
          fillTime: fill.fillTime ?? "",
          fillId: fill.fillId ?? "",
          accountId: fill.accountId ?? resolvedAccountId,
        });
      }
    }
  }

  // 6. Logout
  ws.send(encode(root, "RequestLogout", { templateId: 12, userMsg: ["ryzr"] }));
  ws.close();

  return fills;
}
