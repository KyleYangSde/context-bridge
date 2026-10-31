#!/usr/bin/env node
/**
 * Adapter export smoke: copy fixtures into a temp project_root and call real adapters
 * with BRIDGE_ADAPTER_MOCK unset/0.
 *
 * Usage (from repo root, after build):
 *   node packages/adapters/test/export-smoke.mjs
 *   npm run test:export -w @context-bridge/adapters
 */
import { mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, "..");
const FIXTURES = join(PKG, "fixtures");

delete process.env.BRIDGE_ADAPTER_MOCK;
process.env.BRIDGE_ADAPTER_MOCK = "0";

const { codexAdapter, grokBotAdapter } = await import("../dist/index.js");

async function withTempProject(setup) {
  const dir = await mkdtemp(join(tmpdir(), "cb-adapter-"));
  try {
    await setup(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  await withTempProject(async (dir) => {
    await cp(join(FIXTURES, "codex-export.sample.md"), join(dir, ".codex-export.md"));
    const r = await codexAdapter.export({ project_root: dir, session: "last" });
    assert.equal(r.ok, true, `codex ok: ${JSON.stringify(r)}`);
    assert.equal(r.handoff.frontmatter.source.tool, "codex");
    assert.match(r.handoff.frontmatter.goal, /first-gate/i);
    assert.ok(r.handoff.frontmatter.decisions.length >= 1);
    assert.equal(r.raw_ref, join(dir, ".codex-export.md"));
    console.log("OK codex .codex-export.md →", r.handoff.frontmatter.goal.slice(0, 60));
  });

  await withTempProject(async (dir) => {
    await cp(join(FIXTURES, "grok-export.sample.md"), join(dir, ".grok-export.md"));
    const r = await grokBotAdapter.export({ project_root: dir, session: "btc" });
    assert.equal(r.ok, true, `grok file ok: ${JSON.stringify(r)}`);
    assert.equal(r.handoff.frontmatter.source.tool, "grok-bot");
    assert.match(r.handoff.frontmatter.goal, /APNs/i);
    assert.equal(r.raw_ref, join(dir, ".grok-export.md"));
    console.log("OK grok .grok-export.md →", r.handoff.frontmatter.goal.slice(0, 60));
  });

  await withTempProject(async (dir) => {
    const r = await grokBotAdapter.export({
      project_root: dir,
      session: "hint-sess",
      hint: "summary: Approve tray write\nRelay push hooks next",
    });
    assert.equal(r.ok, true, `grok hint ok: ${JSON.stringify(r)}`);
    assert.equal(r.handoff.frontmatter.goal, "Approve tray write");
    assert.equal(r.raw_ref, "hint://summary");
    console.log("OK grok summary: hint →", r.handoff.frontmatter.goal);
  });

  await withTempProject(async (dir) => {
    const r = await codexAdapter.export({ project_root: dir });
    assert.equal(r.ok, false);
    assert.ok(r.code === "not_found" || r.code === "parse_error", r.code);
    console.log("OK codex missing export →", r.code);
  });

  console.log("PASS adapters export-smoke");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
