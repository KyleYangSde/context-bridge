import { networkInterfaces } from "node:os";
import { createRelayServer } from "./server.js";

function guessLanIpv4(): string | null {
  const nets = networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const n of list) {
      if (n.family !== "IPv4" || n.internal) continue;
      const p = n.address.split(".").map(Number);
      if (p[0] === 10) return n.address;
      if (p[0] === 192 && p[1] === 168) return n.address;
      if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return n.address;
    }
  }
  return null;
}

const relay = createRelayServer({});
const info = await relay.listen();
const lan = guessLanIpv4();
const phoneUrl =
  info.host === "0.0.0.0" && lan
    ? `http://${lan}:${info.port}`
    : `http://${info.host === "0.0.0.0" ? "<LAN-IP>" : info.host}:${info.port}`;

console.log(
  JSON.stringify(
    {
      ok: true,
      service: "context-bridge-relay",
      bind: `http://${info.host}:${info.port}`,
      phone_url: phoneUrl,
      env: "BRIDGE_RELAY_HOST (default 0.0.0.0), BRIDGE_RELAY_PORT (default 17832)",
      pairing: 'POST /v1/devices { role: "pc"|"ios", label?, apns_token? }',
      note: "Phone/Cap: use phone_url only — never PC local-api :17831. iOS PUT body → 403. APNs stub → GET /v1/push-log",
    },
    null,
    2,
  ),
);
