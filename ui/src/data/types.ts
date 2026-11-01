/** HANDOFF.v1 frontmatter + UI status — aligned with context-bridge/HANDOFF.v1.md */

export type HandoffTool =
  | 'grok-bot'
  | 'codex'
  | 'claude-code'
  | 'opencode'
  | 'muse'
  | 'workbuddy'
  | 'other'
  | 'manual'

export type HandoffState =
  | 'draft'
  | 'ready'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'consumed'
  | 'superseded'
  | 'expired'

export type SecretsScan = 'pass' | 'fail'

export interface HandoffSource {
  tool: HandoffTool
  session_id: string
  producer?: 'shell' | 'cli' | 'mcp' | 'manual'
}

export interface HandoffFrontmatter {
  schema: 'handoff.v1'
  source: HandoffSource
  as_of: string
  goal: string
  decisions: string[]
  constraints: string[]
  open_questions: string[]
  files_touched: string[]
  commands?: string[]
  supersedes?: string | null
  ttl_hours?: number
  secrets_scan?: SecretsScan
}

export interface HandoffCardModel {
  id: string
  frontmatter: HandoffFrontmatter
  body?: string
  state: HandoffState
  reject_reason?: string | null
}

export const SOURCE_OPTIONS: { tool: HandoffTool; label: string; ready: boolean }[] = [
  { tool: 'grok-bot', label: 'Grok Bot', ready: true },
  { tool: 'codex', label: 'Codex', ready: true },
  { tool: 'claude-code', label: 'Claude Code', ready: false },
  { tool: 'opencode', label: 'OpenCode', ready: false },
]

export const STATE_LABELS: Record<HandoffState, { zh: string; en: string }> = {
  draft: { zh: '草稿', en: 'Draft' },
  ready: { zh: '就绪', en: 'Ready' },
  pending_review: { zh: '待审', en: 'Pending' },
  approved: { zh: '已批准', en: 'Approved' },
  rejected: { zh: '已驳回', en: 'Rejected' },
  consumed: { zh: '已接手', en: 'Consumed' },
  superseded: { zh: '已替代', en: 'Superseded' },
  expired: { zh: '已过期', en: 'Expired' },
}
