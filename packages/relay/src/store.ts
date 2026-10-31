import { randomBytes } from "node:crypto";
import {
  assertRejectReason,
  assertTransition,
  emptyStatus,
  parseHandoffMarkdown,
  serializeHandoff,
  secretsScan,
  validateFrontmatter,
  type HandoffDocument,
  type HandoffFrontmatter,
  type HandoffState,
  type HandoffStatus,
} from "@context-bridge/core";

export type DeviceRole = "pc" | "ios" | "other";

export interface Device {
  id: string;
  role: DeviceRole;
  token: string;
  apns_token?: string;
  label?: string;
  created_at: string;
}

export interface PushLogEntry {
  at: string;
  device_id: string;
  event: string;
  detail?: string;
}

export interface RelayStore {
  handoff: HandoffDocument | null;
  status: HandoffStatus;
  devices: Map<string, Device>;
  pushLog: PushLogEntry[];
}

export function createMemoryStore(): RelayStore {
  return {
    handoff: null,
    status: emptyStatus({ state: "draft" }),
    devices: new Map(),
    pushLog: [],
  };
}

export function registerDevice(
  store: RelayStore,
  input: { role: DeviceRole; label?: string; apns_token?: string },
): Device {
  const id = randomBytes(8).toString("hex");
  const token = randomBytes(24).toString("hex");
  const device: Device = {
    id,
    role: input.role,
    token,
    apns_token: input.apns_token,
    label: input.label,
    created_at: new Date().toISOString(),
  };
  store.devices.set(token, device);
  // Hook: registration with APNs token → stub push event (still fake APNs)
  if (device.apns_token) {
    stubPush(store, "device_registered", `role=${device.role}`);
  }
  return device;
}

/**
 * MVP: re-POST /v1/devices with apns_token to register a new device that has a token.
 * Updating an existing device's apns_token is not exposed yet (would need device id auth).
 */
export function findDeviceByToken(store: RelayStore, token: string | null): Device | null {
  if (!token) return null;
  return store.devices.get(token) ?? null;
}

export function putHandoffOnRelay(
  store: RelayStore,
  input:
    | { frontmatter: HandoffFrontmatter; body: string; force?: boolean }
    | { markdown: string; force?: boolean },
): { doc: HandoffDocument; status: HandoffStatus } {
  // Single-slot: refuse silent overwrite while under review / approved (pass force:true to supersede).
  if (
    (store.status.state === "pending_review" || store.status.state === "approved") &&
    input.force !== true
  ) {
    const err = new Error("handoff_locked") as Error & { status: number; body: unknown };
    err.status = 409;
    err.body = {
      error: "handoff_locked",
      state: store.status.state,
      current_as_of: store.status.current_as_of,
      message: "pass force:true to overwrite a pending_review/approved handoff",
    };
    throw err;
  }
  let doc: HandoffDocument;
  if ("markdown" in input && input.markdown != null) {
    doc = parseHandoffMarkdown(input.markdown);
  } else {
    const parts = input as { frontmatter: HandoffFrontmatter; body: string };
    doc = {
      frontmatter: validateFrontmatter(parts.frontmatter),
      body: parts.body ?? "",
    };
  }
  const md = serializeHandoff(doc);
  const scan = secretsScan(md);
  if (!scan.ok) {
    const err = new Error("secrets_scan_failed") as Error & {
      status: number;
      body: unknown;
    };
    err.status = 422;
    err.body = { error: "secrets_scan_failed", hits: scan.hits };
    throw err;
  }
  doc.frontmatter.secrets_scan = "pass";

  if (store.handoff) {
    if (doc.frontmatter.supersedes == null) {
      doc.frontmatter.supersedes = store.handoff.frontmatter.as_of;
    }
  }

  store.handoff = doc;
  store.status = {
    state: "ready",
    current_as_of: doc.frontmatter.as_of,
    reject_reason: null,
    consumers: [],
    updated_at: new Date().toISOString(),
  };

  stubPush(store, "handoff_updated", `as_of=${doc.frontmatter.as_of}`);
  return { doc, status: store.status };
}

export function patchStatusOnRelay(
  store: RelayStore,
  patch: {
    state: HandoffState;
    reject_reason?: string | null;
    consumer?: { id: string; event?: string };
  },
): HandoffStatus {
  assertTransition(store.status.state, patch.state);
  assertRejectReason(patch.state, patch.reject_reason ?? store.status.reject_reason);

  const consumers = [...(store.status.consumers ?? [])];
  if (patch.consumer?.id) {
    consumers.push({
      id: patch.consumer.id,
      at: new Date().toISOString(),
      event: patch.consumer.event ?? patch.state,
    });
  }

  store.status = {
    ...store.status,
    state: patch.state,
    reject_reason:
      patch.state === "rejected"
        ? (patch.reject_reason ?? "").trim()
        : patch.reject_reason !== undefined
          ? patch.reject_reason
          : store.status.reject_reason,
    consumers,
    updated_at: new Date().toISOString(),
  };

  stubPush(store, "status_updated", `state=${patch.state}`);
  if (patch.state === "approved" || patch.state === "rejected") {
    stubPush(store, "review_resolved", `state=${patch.state}`);
  }
  return store.status;
}

/**
 * No real APNs — append a log row for EVERY registered device, mark apns:true|false,
 * and emit one summary console line (not per-device spam).
 */
export function stubPush(store: RelayStore, event: string, detail?: string): void {
  const at = new Date().toISOString();
  const devices = [...store.devices.values()];
  let withToken = 0;
  for (const d of devices) {
    const hasApns = Boolean(d.apns_token);
    if (hasApns) withToken += 1;
    const bits = [detail, `apns:${hasApns}`].filter((x) => x != null && String(x).length);
    store.pushLog.push({
      at,
      device_id: d.id,
      event,
      detail: bits.join(" "),
    });
  }
  console.info(
    `[relay-apns-stub] event=${event} devices=${devices.length} with_token=${withToken}` +
      (detail ? ` ${detail}` : ""),
  );
  // keep last 100
  if (store.pushLog.length > 100) {
    store.pushLog.splice(0, store.pushLog.length - 100);
  }
}
