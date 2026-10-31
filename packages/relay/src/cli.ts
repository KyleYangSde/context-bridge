import { createRelayServer } from "./server.js";

const relay = createRelayServer({});
const info = await relay.listen();
console.log(
  JSON.stringify(
    {
      ok: true,
      service: "context-bridge-relay",
      url: `http://${info.host}:${info.port}`,
      pairing: "POST /v1/devices { role: \"pc\"|\"ios\", label?, apns_token? }",
      note: "iOS PUT /v1/handoff → 403; APNs stubbed to /v1/push-log",
    },
    null,
    2,
  ),
);
