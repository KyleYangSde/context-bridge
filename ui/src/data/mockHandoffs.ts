import type { HandoffCardModel } from './types'

/** Sample cards matching HANDOFF.v1 — no raw transcript */

export const mockHandoffs: HandoffCardModel[] = [
  {
    id: 'h1',
    state: 'pending_review',
    frontmatter: {
      schema: 'handoff.v1',
      source: {
        tool: 'codex',
        session_id: 'sess_example_001',
        producer: 'cli',
      },
      as_of: '2026-10-31T21:20:00+08:00',
      goal: '把 Codex 半截任务交接到 Claude Code',
      decisions: [
        '采用文件交接，不做实时双向同步',
        'PC 与 iOS 同步开；壳走 Capacitor 同皮',
      ],
      constraints: ['不写 raw transcript', '密钥扫描不过则拒写'],
      open_questions: ['用户是否确认 Context Bridge MVP？'],
      files_touched: [
        'context-bridge/HANDOFF.v1.md',
        'context-bridge/design/wireframe-pc-tray.html',
      ],
      commands: [],
      supersedes: null,
      ttl_hours: 72,
      secrets_scan: 'pass',
    },
  },
  {
    id: 'h2',
    state: 'approved',
    frontmatter: {
      schema: 'handoff.v1',
      source: {
        tool: 'grok-bot',
        session_id: 'btc-team-20261031',
        producer: 'manual',
      },
      as_of: '2026-10-31T20:05:00+08:00',
      goal: '群结论落成交接卡，供 Codex 继续实现',
      decisions: [
        '多向 Adapter → 同一 .agent-bridge/',
        '默认 Capacitor 真·一份 UI',
      ],
      constraints: ['不做实时双向同步', '手机不跑本机 Agent'],
      open_questions: [],
      files_touched: ['context-bridge/ADAPTER.v0.md', 'context-bridge/SYNC.v0.md'],
      ttl_hours: 48,
      secrets_scan: 'pass',
    },
  },
  {
    id: 'h3',
    state: 'superseded',
    frontmatter: {
      schema: 'handoff.v1',
      source: {
        tool: 'codex',
        session_id: 'sess_old_000',
        producer: 'cli',
      },
      as_of: '2026-10-31T18:00:00+08:00',
      goal: '初版：仅 Codex→Claude 单向出口（已废弃）',
      decisions: ['曾计划单向上游'],
      constraints: [],
      open_questions: [],
      files_touched: [],
      supersedes: null,
      ttl_hours: 24,
      secrets_scan: 'pass',
    },
  },
  {
    id: 'h4',
    state: 'rejected',
    reject_reason: '含疑似 token，请脱敏后重试',
    frontmatter: {
      schema: 'handoff.v1',
      source: {
        tool: 'opencode',
        session_id: 'oc_placeholder',
        producer: 'shell',
      },
      as_of: '2026-10-31T19:40:00+08:00',
      goal: 'OpenCode 会话摘要（占位导出）',
      decisions: [],
      constraints: ['密钥扫描不过则拒写'],
      open_questions: ['何时接上真实导出？'],
      files_touched: [],
      secrets_scan: 'fail',
    },
  },
]

export const primaryMock = mockHandoffs[0]

/** Blank draft for live empty / tray 空态 — ready to fill and PUT */
export function emptyDraftCard(
  tool: HandoffCardModel['frontmatter']['source']['tool'] = 'codex',
): HandoffCardModel {
  const asOf = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00')
  return {
    id: 'draft-empty',
    state: 'draft',
    frontmatter: {
      schema: 'handoff.v1',
      source: { tool, session_id: `ui-empty-${Date.now()}`, producer: 'manual' },
      as_of: asOf,
      goal: '',
      decisions: [],
      constraints: ['不写 raw transcript', '密钥扫描不过则拒写'],
      open_questions: [],
      files_touched: [],
      secrets_scan: 'pass',
    },
    body: '',
  }
}
