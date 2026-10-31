import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { HandoffState } from "@context-bridge/core";
import {
  createMemoryStore,
  findDeviceByToken,
  putHandoffOnRelay,
  patchStatusOnRelay,
  registerDevice,
  type RelayStore,
  type DeviceRole,
} from "./store.js";

export type RelayOptions = {
  host?: string;
  port?: number;
  store?: RelayStore;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
  });
  res.end(data);
}

function getBearer(req: IncomingMessage): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

const LOCAL_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
  "http://127.0.0.1:1420",
  "http://localhost:1420",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
]);

/** Cap WebView + private-LAN Vite/dev origins for phone on same Wi‑Fi */
function isAllowedOrigin(origin: string): boolean {
  if (LOCAL_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1") return true;
    const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
    if (!m) return false;
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  } catch {
    return false;
  }
}

function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (typeof origin === "string" && isAllowedOrigin(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-credentials", "true");
    res.setHeader(
      "access-control-allow-headers",
      "authorization, content-type, x-bridge-token",
    );
    res.setHeader("access-control-allow-methods", "GET,PUT,POST,PATCH,OPTIONS");
  }
  if ((req.method ?? "").toUpperCase() === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

export function createRelayServer(opts: RelayOptions = {}) {
  const host = opts.host ?? process.env.BRIDGE_RELAY_HOST ?? "0.0.0.0";
  const port = opts.port ?? Number(process.env.BRIDGE_RELAY_PORT ?? 17832);
  const store = opts.store ?? createMemoryStore();

  const server = createServer(async (req, res) => {
    try {
      if (applyCors(req, res)) return;
      const url = new URL(req.url ?? "/", `http://${host}:${port}`);
      const method = (req.method ?? "GET").toUpperCase();
      const path = url.pathname;

      if (method === "GET" && path === "/health") {
        return json(res, 200, {
          ok: true,
          version: "0.1.0",
          service: "context-bridge-relay",
          devices: store.devices.size,
          has_handoff: store.handoff != null,
        });
      }

      // Device registration is the pairing stub (no auth required for MVP fake gate)
      if (method === "POST" && path === "/v1/devices") {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const role = (body.role ?? "other") as DeviceRole;
        if (!["pc", "ios", "other"].includes(role)) {
          return json(res, 400, { error: "invalid_role" });
        }
        const device = registerDevice(store, {
          role,
          label: body.label,
          apns_token: body.apns_token,
        });
        return json(res, 201, {
          device_id: device.id,
          role: device.role,
          token: device.token,
          message: "store token; do not reuse PC .bridge-token on iOS",
        });
      }

      const device = findDeviceByToken(store, getBearer(req));
      if (!device) {
        return json(res, 401, {
          error: "unauthorized",
          message: "register via POST /v1/devices then Authorization: Bearer <device token>",
        });
      }

      if (method === "GET" && path === "/v1/handoff") {
        if (!store.handoff) return json(res, 404, { error: "not_found" });
        return json(res, 200, {
          frontmatter: store.handoff.frontmatter,
          body: store.handoff.body,
          status: store.status,
        });
      }

      if (method === "PUT" && path === "/v1/handoff") {
        // iOS cannot PUT body
        if (device.role === "ios") {
          return json(res, 403, {
            error: "forbidden",
            message: "iOS cannot PUT handoff body; use PATCH /v1/handoff/status",
          });
        }
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        try {
          const result = putHandoffOnRelay(store, body);
          return json(res, 200, {
            frontmatter: result.doc.frontmatter,
            body: result.doc.body,
            status: result.status,
          });
        } catch (e) {
          const err = e as Error & { status?: number; body?: unknown };
          if (err.status === 422) return json(res, 422, err.body);
          throw e;
        }
      }

      if (method === "GET" && path === "/v1/handoff/status") {
        return json(res, 200, store.status);
      }

      if (method === "PATCH" && path === "/v1/handoff/status") {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        if (!body.state) return json(res, 400, { error: "state_required" });
        try {
          const status = patchStatusOnRelay(store, {
            state: body.state as HandoffState,
            reject_reason: body.reject_reason,
            consumer: body.consumer ?? { id: device.role, event: body.state },
          });
          return json(res, 200, status);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const code = msg.includes("reject_reason") ? 400 : 409;
          return json(res, code, { error: "invalid_transition", message: msg });
        }
      }

      if (method === "GET" && path === "/v1/push-log") {
        // debug: stub APNs log
        return json(res, 200, { log: store.pushLog });
      }

      return json(res, 404, { error: "not_found", path });
    } catch (e) {
      if (e instanceof SyntaxError) {
        return json(res, 400, { error: "invalid_json", message: e.message });
      }
      console.error(e);
      return json(res, 500, {
        error: "internal",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return {
    server,
    store,
    host,
    port,
    listen: () =>
      new Promise<{ host: string; port: number }>((resolve, reject) => {
        server.listen(port, host, () => resolve({ host, port }));
        server.on("error", reject);
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
