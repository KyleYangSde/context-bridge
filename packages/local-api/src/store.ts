import { mkdir, readFile, rename, writeFile, access } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import {
  emptyStatus,
  parseHandoffMarkdown,
  serializeHandoff,
  secretsScan,
  validateFrontmatter,
  assertTransition,
  assertRejectReason,
  type HandoffDocument,
  type HandoffFrontmatter,
  type HandoffStatus,
  type HandoffState,
} from "@context-bridge/core";
import {
  bridgeDir,
  handoffPath,
  historyDir,
  statusPath,
  tokenPath,
} from "./paths.js";

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export async function ensureBridgeDir(projectRoot: string): Promise<void> {
  await mkdir(bridgeDir(projectRoot), { recursive: true });
  await mkdir(historyDir(projectRoot), { recursive: true });
}

export async function ensureToken(projectRoot: string): Promise<string> {
  await ensureBridgeDir(projectRoot);
  const p = tokenPath(projectRoot);
  try {
    await access(p, constants.R_OK);
    return (await readFile(p, "utf8")).trim();
  } catch {
    const token = randomBytes(24).toString("hex");
    await writeFile(p, token + "\n", { mode: 0o600 });
    return token;
  }
}

export async function readToken(projectRoot: string): Promise<string | null> {
  try {
    return (await readFile(tokenPath(projectRoot), "utf8")).trim();
  } catch {
    return null;
  }
}

export async function readStatus(projectRoot: string): Promise<HandoffStatus> {
  try {
    const raw = await readFile(statusPath(projectRoot), "utf8");
    return { ...emptyStatus(), ...JSON.parse(raw) } as HandoffStatus;
  } catch {
    return emptyStatus();
  }
}

export async function writeStatus(
  projectRoot: string,
  status: HandoffStatus,
): Promise<HandoffStatus> {
  await ensureBridgeDir(projectRoot);
  const next = { ...status, updated_at: new Date().toISOString() };
  await writeFile(statusPath(projectRoot), JSON.stringify(next, null, 2) + "\n");
  return next;
}

export async function readHandoff(
  projectRoot: string,
): Promise<{ doc: HandoffDocument; path: string; status: HandoffStatus } | null> {
  const path = handoffPath(projectRoot);
  if (!existsSync(path)) return null;
  const md = await readFile(path, "utf8");
  const doc = parseHandoffMarkdown(md);
  const status = await readStatus(projectRoot);
  return { doc, path, status };
}

async function archiveCurrent(projectRoot: string, asOf: string): Promise<void> {
  const cur = handoffPath(projectRoot);
  if (!existsSync(cur)) return;
  await mkdir(historyDir(projectRoot), { recursive: true });
  const safe = asOf.replace(/[:]/g, "-");
  const dest = join(historyDir(projectRoot), `HANDOFF.${safe}.md`);
  try {
    await rename(cur, dest);
  } catch {
    // if rename across devices fails, copy+unlink not needed for MVP same FS
    const content = await readFile(cur, "utf8");
    await writeFile(dest, content);
  }
}

export type PutHandoffInput =
  | { frontmatter: HandoffFrontmatter; body: string }
  | { markdown: string };

/**
 * Validate schema → secrets_scan → atomic write.
 * On supersede, move old card to history/ and mark superseded in status before writing new.
 */
export async function putHandoff(
  projectRoot: string,
  input: PutHandoffInput,
  opts?: { initialState?: HandoffState },
): Promise<{ doc: HandoffDocument; status: HandoffStatus; path: string }> {
  await ensureBridgeDir(projectRoot);

  let doc: HandoffDocument;
  if ("markdown" in input && input.markdown != null) {
    doc = parseHandoffMarkdown(input.markdown);
  } else {
    const parts = input as { frontmatter: HandoffFrontmatter; body: string };
    const fm = validateFrontmatter(parts.frontmatter);
    doc = { frontmatter: fm, body: parts.body ?? "" };
  }

  const scanText = serializeHandoff(doc);
  const scan = secretsScan(scanText);
  if (!scan.ok) {
    throw new StoreError("secrets_scan_failed", 422, {
      error: "secrets_scan_failed",
      hits: scan.hits,
    });
  }
  doc.frontmatter.secrets_scan = "pass";

  const prev = await readHandoff(projectRoot);
  if (prev) {
    const prevAsOf = prev.doc.frontmatter.as_of;
    if (doc.frontmatter.supersedes == null) {
      doc.frontmatter.supersedes = prevAsOf;
    }
    await archiveCurrent(projectRoot, prevAsOf);
    // mark previous lifecycle if we still have status
    const st = await readStatus(projectRoot);
    if (st.state !== "superseded" && st.state !== "expired") {
      try {
        assertTransition(st.state, "superseded");
        await writeStatus(projectRoot, {
          ...st,
          state: "superseded",
          updated_at: new Date().toISOString(),
        });
      } catch {
        /* ignore illegal — still archive */
      }
    }
  }

  const path = handoffPath(projectRoot);
  const md = serializeHandoff(doc);
  const tmp = path + ".tmp";
  await writeFile(tmp, md, "utf8");
  await rename(tmp, path);

  const initial: HandoffState = opts?.initialState ?? "ready";
  const status = await writeStatus(projectRoot, {
    state: initial,
    current_as_of: doc.frontmatter.as_of,
    reject_reason: null,
    consumers: [],
    updated_at: new Date().toISOString(),
  });

  return { doc, status, path };
}

export async function patchStatus(
  projectRoot: string,
  patch: {
    state: HandoffState;
    reject_reason?: string | null;
    consumer?: { id: string; event?: string };
  },
): Promise<HandoffStatus> {
  const current = await readStatus(projectRoot);
  assertTransition(current.state, patch.state);
  assertRejectReason(patch.state, patch.reject_reason ?? current.reject_reason);

  const consumers = [...(current.consumers ?? [])];
  if (patch.consumer?.id) {
    consumers.push({
      id: patch.consumer.id,
      at: new Date().toISOString(),
      event: patch.consumer.event ?? patch.state,
    });
  }

  return writeStatus(projectRoot, {
    ...current,
    state: patch.state,
    reject_reason:
      patch.state === "rejected"
        ? (patch.reject_reason ?? "").trim()
        : patch.reject_reason !== undefined
          ? patch.reject_reason
          : current.reject_reason,
    consumers,
  });
}
