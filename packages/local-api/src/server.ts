import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { getAdapter, listAdapters } from "@context-bridge/adapters";
import type { HandoffState } from "@context-bridge/core";
import {
  ensureToken,
  putHandoff,
  readHandoff,
  readStatus,
  patchStatus,
  StoreError,
} from "./store.js";

export type LocalApiOptions = {
  projectRoot: string;
  host?: string;
  port?: number;
  /** When true, skip auth (tests only) */
  skipAuth?: boolean;
};

type ProjectEntry = { root: string; opened_at: string };

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
]);

function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (typeof origin === "string" && LOCAL_ORIGINS.has(origin)) {
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

export async function createLocalApiServer(opts: LocalApiOptions) {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? Number(process.env.BRIDGE_PORT ?? 17831);
  let projectRoot = opts.projectRoot;
  const recent: ProjectEntry[] = [
    { root: projectRoot, opened_at: new Date().toISOString() },
  ];
  const token = await ensureToken(projectRoot);

  async function requireAuth(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (opts.skipAuth) return true;
    // GET /health is open
    const bearer = getBearer(req);
    if (bearer && bearer === token) return true;
    // also accept x-bridge-token
    const hdr = req.headers["x-bridge-token"];
    if (typeof hdr === "string" && hdr === token) return true;
    json(res, 401, { error: "unauthorized", message: "missing or invalid bridge token" });
    return false;
  }

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
          project_root: projectRoot,
        });
      }

      if (!(await requireAuth(req, res))) return;

      if (method === "GET" && path === "/v1/handoff") {
        const cur = await readHandoff(projectRoot);
        if (!cur) return json(res, 404, { error: "not_found" });
        return json(res, 200, {
          frontmatter: cur.doc.frontmatter,
          body: cur.doc.body,
          path: cur.path,
          status: cur.status,
        });
      }

      if (method === "PUT" && path === "/v1/handoff") {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const result = await putHandoff(projectRoot, body);
        return json(res, 200, {
          frontmatter: result.doc.frontmatter,
          body: result.doc.body,
          path: result.path,
          status: result.status,
        });
      }

      if (method === "GET" && path === "/v1/handoff/status") {
        return json(res, 200, await readStatus(projectRoot));
      }

      if (method === "PATCH" && path === "/v1/handoff/status") {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        if (!body.state) {
          return json(res, 400, { error: "state_required" });
        }
        try {
          const status = await patchStatus(projectRoot, {
            state: body.state as HandoffState,
            reject_reason: body.reject_reason,
            consumer: body.consumer,
          });
          return json(res, 200, status);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const code = msg.includes("reject_reason") ? 400 : 409;
          return json(res, code, { error: "invalid_transition", message: msg });
        }
      }

      if (method === "POST" && path.startsWith("/v1/export/")) {
        const producer = decodeURIComponent(path.slice("/v1/export/".length));
        const adapter = getAdapter(producer);
        if (!adapter) return json(res, 404, { error: "unknown_producer", producer });
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const result = await adapter.export({
          session: body.session,
          hint: body.hint,
          project_root: projectRoot,
        });
        if (!result.ok) {
          const status =
            result.code === "unsupported"
              ? 501
              : result.code === "not_found"
                ? 404
                : result.code === "secrets_blocked"
                  ? 422
                  : 422;
          return json(res, status, result);
        }
        const written = await putHandoff(projectRoot, {
          frontmatter: result.handoff.frontmatter,
          body: result.handoff.body,
        });
        return json(res, 200, {
          job_id: `sync-${Date.now()}`,
          state: "done",
          handoff: {
            frontmatter: written.doc.frontmatter,
            body: written.doc.body,
          },
          status: written.status,
          raw_ref: result.raw_ref,
        });
      }

      if (method === "GET" && path === "/v1/adapters") {
        return json(res, 200, {
          adapters: listAdapters().map((a) => ({
            id: a.id,
            label: a.label,
            exportable: a.exportable,
          })),
        });
      }

      if (method === "GET" && path === "/v1/projects") {
        return json(res, 200, { current: projectRoot, recent });
      }

      if (method === "POST" && path === "/v1/projects/open") {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        if (!body.root || typeof body.root !== "string") {
          return json(res, 400, { error: "root_required" });
        }
        projectRoot = body.root;
        recent.unshift({ root: projectRoot, opened_at: new Date().toISOString() });
        // dedupe
        const seen = new Set<string>();
        const deduped = recent.filter((e) => {
          if (seen.has(e.root)) return false;
          seen.add(e.root);
          return true;
        });
        recent.length = 0;
        recent.push(...deduped.slice(0, 10));
        await ensureToken(projectRoot);
        return json(res, 200, { current: projectRoot, recent });
      }

      return json(res, 404, { error: "not_found", path });
    } catch (e) {
      if (e instanceof StoreError) {
        return json(res, e.status, e.body ?? { error: e.message });
      }
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
    host,
    port,
    token,
    getProjectRoot: () => projectRoot,
    listen: () =>
      new Promise<{ host: string; port: number; token: string }>((resolve, reject) => {
        server.listen(port, host, () => resolve({ host, port, token }));
        server.on("error", reject);
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
