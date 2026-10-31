import type { HandoffState } from "./types.js";

/** Allowed transitions for HANDOFF lifecycle */
const EDGES: Record<HandoffState, readonly HandoffState[]> = {
  draft: ["ready", "expired"],
  ready: ["pending_review", "approved", "superseded", "expired"],
  pending_review: ["approved", "rejected", "superseded", "expired"],
  approved: ["consumed", "superseded", "expired", "rejected"],
  rejected: ["draft", "ready", "superseded", "expired"],
  consumed: ["superseded", "expired"],
  superseded: [],
  expired: [],
};

export function canTransition(from: HandoffState, to: HandoffState): boolean {
  if (from === to) return true;
  return (EDGES[from] ?? []).includes(to);
}

export class StateTransitionError extends Error {
  constructor(
    public readonly from: HandoffState,
    public readonly to: HandoffState,
    message?: string,
  ) {
    super(message ?? `Illegal transition: ${from} → ${to}`);
    this.name = "StateTransitionError";
  }
}

export function assertTransition(from: HandoffState, to: HandoffState): void {
  if (!canTransition(from, to)) {
    throw new StateTransitionError(from, to);
  }
}

export function assertRejectReason(
  to: HandoffState,
  reject_reason: string | null | undefined,
): void {
  if (to === "rejected") {
    const r = (reject_reason ?? "").trim();
    if (!r) {
      throw new Error("rejected requires reject_reason");
    }
  }
}

export { EDGES as STATE_EDGES };
