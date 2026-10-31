/** HANDOFF.v1 types — aligned with HANDOFF.v1.md */

export const HANDOFF_SCHEMA = "handoff.v1" as const;

export type SourceTool =
  | "codex"
  | "claude-code"
  | "opencode"
  | "grok-bot"
  | "muse"
  | "workbuddy"
  | "other"
  | (string & {});

export type SourceProducer = "shell" | "cli" | "mcp" | "manual" | (string & {});

export interface HandoffSource {
  tool: SourceTool;
  session_id: string;
  producer?: SourceProducer;
}

export type SecretsScanResult = "pass" | "fail";

export type HandoffState =
  | "draft"
  | "ready"
  | "pending_review"
  | "approved"
  | "rejected"
  | "consumed"
  | "superseded"
  | "expired";

/** Frontmatter fields for handoff.v1 */
export interface HandoffFrontmatter {
  schema: typeof HANDOFF_SCHEMA | string;
  source: HandoffSource;
  as_of: string;
  goal: string;
  decisions: string[];
  constraints: string[];
  open_questions: string[];
  files_touched: string[];
  commands?: string[];
  supersedes?: string | null;
  ttl_hours?: number | null;
  secrets_scan?: SecretsScanResult;
}

export interface HandoffDocument {
  frontmatter: HandoffFrontmatter;
  body: string;
}

export interface StatusConsumer {
  id: string;
  at: string;
  event: string;
}

export interface HandoffStatus {
  state: HandoffState;
  current_as_of: string | null;
  reject_reason: string | null;
  consumers: StatusConsumer[];
  updated_at: string;
}

export function emptyStatus(partial?: Partial<HandoffStatus>): HandoffStatus {
  return {
    state: "draft",
    current_as_of: null,
    reject_reason: null,
    consumers: [],
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

/** States that consumers may treat as the current handoff truth */
export const CURRENT_TRUTH_STATES: ReadonlySet<HandoffState> = new Set([
  "approved",
  "consumed",
]);

export function isCurrentTruth(state: HandoffState): boolean {
  return CURRENT_TRUTH_STATES.has(state);
}
