#!/usr/bin/env node
/**
 * Relay APNs-stub smoke (self-contained — spins relay on ephemeral port).
 * Asserts push-log events: device_registered, handoff_updated, status_updated, review_resolved.
 *
 * Usage: node scripts/smoke-push-log.mjs
 */
import { createRelayServer } from "../packages/relay/dist/server.js";

function fail(step, detail) {
  console.error(`FAIL [${step}]`, detail);
  process.exit(1);
}

async function jfetch(url, init = {}) {
  const r = await fetch(url, init);
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: r.ok, status: r.status, body };
}

async function main() {
  const relay = createRelayServer({ host: "127.0.0.1", port: 0 });
  await new Promise((resolve, reject) => {
    relay.server.listen(0, "127.0.0.1", () => resolve());
    relay.server.on("error", reject);
  });
  const addr = relay.server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const BASE = `http://127.0.0.1:${port}`;
  console.log(`relay ephemeral :${port}`);

  try {
    const iosReg = await jfetch(`${BASE}/v1/devices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role: "ios",
        label: "smoke-ios",
        apns_token: "fake-token-xxx",
      }),
    });
    if (!iosReg.ok) fail("register ios", iosReg);
    const iosTok = iosReg.body.token;

    const pcReg = await jfetch(`${BASE}/v1/devices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "pc", label: "smoke-pc" }),
    });
    if (!pcReg.ok) fail("register pc", pcReg);
    const pcTok = pcReg.body.token;

    const payload = {
      frontmatter: {
        schema: "handoff.v1",
        source: { tool: "codex", session_id: "push-smoke", producer: "cli" },
        as_of: new Date().toISOString(),
        goal: "smoke push-log",
        decisions: [],
        constraints: [],
        open_questions: [],
        files_touched: [],
      },
      body: "# Handoff\n\n## Goal\n\nsmoke push-log\n",
    };

    const put = await jfetch(`${BASE}/v1/handoff`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${pcTok}`,
      },
      body: JSON.stringify(payload),
    });
    if (!put.ok) fail("PUT handoff", put);

    const pr = await jfetch(`${BASE}/v1/handoff/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${pcTok}`,
      },
      body: JSON.stringify({ state: "pending_review" }),
    });
    if (!pr.ok) fail("pending_review", pr);

    const ap = await jfetch(`${BASE}/v1/handoff/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${iosTok}`,
      },
      body: JSON.stringify({
        state: "approved",
        consumer: { id: "smoke-ios", event: "approved" },
      }),
    });
    if (!ap.ok) fail("approved", ap);

    const log = await jfetch(`${BASE}/v1/push-log`, {
      headers: { Authorization: `Bearer ${pcTok}` },
    });
    if (!log.ok) fail("push-log", log);
    const events = (log.body?.log ?? []).map((e) => e.event);
    console.log("events:", [...new Set(events)].join(", "));

    for (const need of [
      "device_registered",
      "handoff_updated",
      "status_updated",
      "review_resolved",
    ]) {
      if (!events.includes(need)) {
        fail("events", `missing ${need}; got ${events.join(",")}`);
      }
    }

    const withApns = (log.body.log ?? []).filter((e) =>
      String(e.detail ?? "").includes("apns:true"),
    );
    if (!withApns.length) fail("apns mark", "no apns:true detail rows");

    console.log("PASS smoke-push-log");
  } finally {
    await new Promise((resolve) => relay.server.close(() => resolve()));
  }
}

main().catch((e) => fail("uncaught", e?.stack || String(e)));
