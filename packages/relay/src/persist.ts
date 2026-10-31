import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import {
  createMemoryStore,
  type Device,
  type RelayStore,
  type PushLogEntry,
} from "./store.js";
import { emptyStatus, type HandoffDocument, type HandoffStatus } from "@context-bridge/core";

export type PersistedRelay = {
  handoff: HandoffDocument | null;
  status: HandoffStatus;
  devices: Device[];
  pushLog: PushLogEntry[];
};

export function defaultRelayDataDir(): string {
  return (
    process.env.BRIDGE_RELAY_DATA_DIR?.trim() ||
    join(process.cwd(), "packages", "relay", "data")
  );
}

export function loadPersistedStore(dir: string): RelayStore {
  const file = join(dir, "relay-store.json");
  if (!existsSync(file)) return createMemoryStore();
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as PersistedRelay;
    const store = createMemoryStore();
    store.handoff = raw.handoff ?? null;
    store.status = raw.status
      ? { ...emptyStatus(), ...raw.status }
      : emptyStatus({ state: "draft" });
    store.pushLog = Array.isArray(raw.pushLog) ? raw.pushLog.slice(-100) : [];
    store.devices = new Map();
    for (const d of raw.devices ?? []) {
      if (d?.token) store.devices.set(d.token, d);
    }
    return store;
  } catch (e) {
    console.warn("[relay] persist load failed, using empty store:", e);
    return createMemoryStore();
  }
}

export function savePersistedStore(dir: string, store: RelayStore): void {
  mkdirSync(dir, { recursive: true });
  const payload: PersistedRelay = {
    handoff: store.handoff,
    status: store.status,
    devices: [...store.devices.values()],
    pushLog: store.pushLog.slice(-100),
  };
  const file = join(dir, "relay-store.json");
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n");
  renameSync(tmp, file);
}
