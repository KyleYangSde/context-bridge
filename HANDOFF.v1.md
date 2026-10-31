# HANDOFF.v1 — Context Bridge 交接卡规范（草稿）

> 状态：开码中 · 用户 2026-10-31「做」· Capacitor 同皮  
> 格式：YAML frontmatter + Markdown body · 禁止写入 raw transcript

## 文件落点

- 人读/机读同文件：`.agent-bridge/HANDOFF.md`
- 建议 gitignore 敏感版；脱敏摘要可进仓（另议）
- 消费约定：`AGENTS.md` 写明「开任务前先 Read `.agent-bridge/HANDOFF.md`；收工后更新」

## Frontmatter 字段表

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `schema` | ✅ | string | 固定 `handoff.v1` |
| `source` | ✅ | object | 出处：`tool`（如 `codex`）+ `session_id` |
| `as_of` | ✅ | string | ISO-8601 时间（导出时刻，含时区） |
| `goal` | ✅ | string | 当前任务目标（一句） |
| `decisions` | ✅ | string[] | 已拍板决策；可空数组 |
| `constraints` | ✅ | string[] | 硬约束（勿违反）；可空数组 |
| `open_questions` | ✅ | string[] | 未决问题；可空数组 |
| `files_touched` | ✅ | string[] | 相关/已改路径（相对仓库根） |
| `commands` | — | string[] | 关键命令摘要（脱敏） |
| `supersedes` | — | string | 被本卡替代的上一份 `as_of` 或内容 hash |
| `ttl_hours` | — | number | 过期提示小时数；过期消费方应质疑 |
| `secrets_scan` | — | `pass` \| `fail` | 写入前扫描结果；**`fail` 则拒写整文件** |

### `source` 形状

```yaml
source:
  tool: grok-bot       # 多向：codex | claude-code | opencode | grok-bot | muse | workbuddy | other
  session_id: "..."    # 可追溯 ID；无则用导出物路径/mtime
  producer: shell|cli|mcp|manual   # 可选：谁写入了这张卡
```

### 方向模型（非单向）

- **卡格式与方向无关**：任一 Agent 都可当 producer 或 consumer。
- 例：Grok Bot 群结论 → 写 HANDOFF → Codex/Claude/OpenCode 读；Codex 半截任务 → 同格式 → Grok/其他接。
- MVP 实现可先做一个 producer 适配器，但 **schema 不绑定 Codex→下游**。

## Body（Markdown）

仅人读摘要，建议章节：

1. **Goal** — 与 frontmatter `goal` 一致或略展开  
2. **Decisions** — 条列，对齐 `decisions[]`  
3. **Constraints** — 条列  
4. **Open questions** — 条列  
5. **Evidence** — 指向 `files_touched`，勿贴大段日志  

**禁止**：完整 transcript、思维链、API key / token / `.env` 原文。

## 示例

```markdown
---
schema: handoff.v1
source:
  tool: codex
  session_id: "sess_example_001"
as_of: "2026-10-31T21:20:00+08:00"
goal: "把 Codex 半截任务交接到 Claude Code"
decisions:
  - "采用文件交接，不做实时双向同步"
constraints:
  - "不写 raw transcript"
  - "密钥扫描不过则拒写"
open_questions:
  - "用户是否确认 Context Bridge MVP？"
files_touched:
  - "context-bridge/HANDOFF.v1.md"
commands: []
supersedes: null
ttl_hours: 72
secrets_scan: pass
---

# Handoff

## Goal
把 Codex 半截任务交接到 Claude Code，验收不口述背景能接上。

## Decisions
- 采用文件交接，不做实时双向同步

## Constraints
- 不写 raw transcript
- 密钥扫描不过则拒写

## Open questions
- 用户是否确认 Context Bridge MVP？

## Evidence
- `context-bridge/HANDOFF.v1.md`
```

## 写入硬边界

1. 流水线先 secrets scan → `fail` 则**不落盘**（或只写错误 stub，产品再定）  
2. 不镜像全量会话；只抽字段  
3. MVP 导出源：Codex `/export` Markdown 优先；`~/.codex/sessions` JSONL 备选（解析器后续再写）


## 业务状态机（HANDOFF 生命周期）

> 产品内核：跨工具决策可交接、可追责、可批准。壳只是容器。

```
draft → ready → pending_review? → approved | rejected
                                      ↓
                         consumed | superseded | expired
```

| 状态 | 含义 | 谁触发 | 下游 Agent 可否当「现行」 |
|------|------|--------|-------------------------|
| `draft` | 壳内编辑中，未承诺落盘/上行 | 人 / Adapter 预览 | ❌ |
| `ready` | 已通过 secrets_scan，可写入本地 | 写盘成功 | ❌（待审或待消费策略） |
| `pending_review` | 可选：等人在 PC/iOS 批准 | 开启「需批准」时 | ❌ |
| `approved` | 人已批准（或策略跳过审批直达） | 人 PATCH；或无审批工作流自动 | ✅ **现行** |
| `rejected` | 驳回；**必填 `reject_reason`** | 人 | ❌ |
| `consumed` | 某 consumer 已声明接上 | consumer ack | 仍可读；新卡可 supersede |
| `superseded` | 被更新的卡替代 | 新卡写入带 `supersedes` | ❌ |
| `expired` | 超过 `ttl_hours` | 读时计算或定时 | ❌ |

### 硬规则

1. 正文禁 raw transcript；`source` + `as_of` 必填  
2. `secrets_scan=fail` → **拒写**，不进除 draft 以外的状态  
3. `rejected` 必须有一句 `reject_reason`  
4. 仅 `approved`（及已 approved 后的 `consumed`）可被 AGENTS.md 视为「现行真相」；`superseded`/`expired`/`rejected` 禁止当现行  
5. 仓库内现行文件仍是一张 `HANDOFF.md`；历史进 `history/`，status 里保留生命周期

### `status.json` 建议形状

```json
{
  "state": "approved",
  "current_as_of": "2026-10-31T21:20:00+08:00",
  "reject_reason": null,
  "consumers": [{"id": "claude-code", "at": "...", "event": "consumed"}],
  "updated_at": "..."
}
```

MVP 映射（与旧 pending/acked 对齐）：  
`pending` ≈ `pending_review` 或「已 ready 待消费」；`acked` ≈ `consumed`；审批关闭时可 `ready → approved` 自动跳过 `pending_review`。


## 非目标（本 schema 不覆盖）

- 实时把两个 chat 合成同一会话（仍是交接，不是共享大脑）  
- A2A 网关、注入封闭 Web 内部 session、全量 transcript 湖  

---

变更记录：  
- 2026-10-31 初稿（架构师，仅 schema，无解析器代码）  
- 2026-10-31 明确多向：任意 producer↔consumer，补 `grok-bot` 等 tool 枚举与 `producer` 可选字段
- 2026-10-31 写入业务状态机（draft→…→approved/rejected→consumed/superseded/expired）  
