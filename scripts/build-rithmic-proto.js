// Regenerates src/lib/rithmic/proto-bundle.json from the .proto source files.
// Run this after adding/editing any .proto file used by src/lib/rithmic/client.ts:
//   node scripts/build-rithmic-proto.js
const protobuf = require("protobufjs");
const path = require("path");
const fs = require("fs");

const PROTO_DIR = path.join(__dirname, "..", "src/lib/rithmic/proto");
const OUT_FILE = path.join(__dirname, "..", "src/lib/rithmic/proto-bundle.json");

const files = [
  "base", "request_heartbeat", "response_heartbeat",
  "request_rithmic_system_info", "response_rithmic_system_info",
  "request_login", "response_login",
  "request_logout", "response_logout",
  "request_account_list", "response_account_list",
  "request_login_info", "response_login_info",
  "request_show_fill_history", "response_show_fill_history",
];

const root = new protobuf.Root();
for (const f of files) root.loadSync(path.join(PROTO_DIR, `${f}.proto`));

fs.writeFileSync(OUT_FILE, JSON.stringify(root.toJSON()));
console.log(`Wrote ${OUT_FILE}`);
