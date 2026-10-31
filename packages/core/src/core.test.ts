import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseHandoffMarkdown,
  serializeHandoff,
  secretsScan,
  canTransition,
  assertTransition,
  StateTransitionError,
  assertRejectReason,
  isCurrentTruth,
} from "./index.js";

const SAMPLE = `---
schema: handoff.v1
source:
  tool: codex
  session_id: "sess_1"
as_of: "2026-10-31T21:20:00+08:00"
goal: "test goal"
decisions:
  - "d1"
constraints: []
open_questions: []
files_touched:
  - "a.ts"
secrets_scan: pass
---

# Handoff

## Goal
test goal
`;

test("parse + serialize roundtrip preserves fields", () => {
  const doc = parseHandoffMarkdown(SAMPLE);
  assert.equal(doc.frontmatter.schema, "handoff.v1");
  assert.equal(doc.frontmatter.source.tool, "codex");
  assert.equal(doc.frontmatter.goal, "test goal");
  const again = parseHandoffMarkdown(serializeHandoff(doc));
  assert.equal(again.frontmatter.as_of, doc.frontmatter.as_of);
  assert.deepEqual(again.frontmatter.decisions, ["d1"]);
});

test("secretsScan catches sk- and bearer", () => {
  const bad = secretsScan('token=sk-abcdefghijklmnopqrstuvwxyz1234 Bearer abc.def.ghi');
  assert.equal(bad.ok, false);
  assert.ok(bad.hits.length >= 1);
  const good = secretsScan("no secrets here, just code");
  assert.equal(good.ok, true);
});

test("state machine transitions", () => {
  assert.equal(canTransition("draft", "ready"), true);
  assert.equal(canTransition("ready", "approved"), true);
  assert.equal(canTransition("pending_review", "rejected"), true);
  assert.equal(canTransition("approved", "consumed"), true);
  assert.equal(canTransition("superseded", "approved"), false);
  assert.throws(() => assertTransition("expired", "ready"), StateTransitionError);
  assert.throws(() => assertRejectReason("rejected", ""), /reject_reason/);
  assert.equal(isCurrentTruth("approved"), true);
  assert.equal(isCurrentTruth("ready"), false);
});
