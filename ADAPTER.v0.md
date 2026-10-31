# Context Bridge — Producer Adapter 契约（v0）

> 状态：接口草稿 · **无解析器实现** · 等用户「做」再开码  
> 方向：`source` → 规范化 `HANDOFF.v1`（多 Adapter，同一 `.agent-bridge/`）

## 目标

任一 producer 把「本工具可拿到的上下文」收成 **同一张** HANDOFF.v1 卡。  
不做实时双向同步、不做全量 transcript 镜像。

## 接口（逻辑）

```ts
/** 适配器输入：尽量薄，具体字段按 producer 扩展 */
type ExportRequest = {
  session?: "last" | string;  // 会话/线程 id；无则 last
  hint?: string;              // 可选：用户点选的消息范围/摘要提示
  project_root: string;       // 目标仓库根
};

type AdapterResult =
  | {
      ok: true;
      handoff: HandoffV1;     // frontmatter 对象 + body string
      raw_ref?: string;       // 可选：导出物路径（非 transcript 入库）
    }
  | {
      ok: false;
      code: "unsupported" | "not_found" | "parse_error" | "secrets_blocked";
      message: string;
    };

interface ProducerAdapter {
  /** 与 HANDOFF source.tool / API /export/{producer} 对齐 */
  readonly id: "codex" | "grok-bot" | "claude-code" | "opencode" | string;
  /** 人读名（托盘「选择来源」） */
  readonly label: string;
  /** MVP 是否声称可导出 */
  readonly exportable: boolean;

  /**
   * source → HANDOFF.v1
   * 成功后由 bridge 写盘：secrets_scan → 原子写 HANDOFF.md → status=pending
   */
  export(req: ExportRequest): Promise<AdapterResult>;
}
```

`HandoffV1.frontmatter` 必填对齐 `HANDOFF.v1.md`：  
`schema, source{tool,session_id,producer?}, as_of, goal, decisions, constraints, open_questions, files_touched`。

## MVP 桩一览

| id | label | exportable | 行为（契约，未实现） |
|---|---|---|---|
| `codex` | Codex | ✅ | 读 `/export` Markdown 或 `~/.codex/sessions` → 抽字段；`source.tool=codex` |
| `grok-bot` | Grok Bot | ✅ | 群/私聊**摘要或选定消息** → 卡；`source.tool=grok-bot`；禁止整段 raw 对话入库 |
| `claude-code` | Claude Code | ❌ 占位 | `export` → `{ ok:false, code:"unsupported", message:"暂无导出" }` |
| `opencode` | OpenCode | ❌ 占位 | 同上 |

### `codex` 桩约定

- 输入：`session: last | id`  
- 优先稳定面：Codex `/export` Markdown；JSONL 备选  
- 输出：`source.tool=codex`，`source.session_id` 可追溯  
- 失败：无会话 → `not_found`；格式漂 → `parse_error`（可附 `raw_ref` 供人工）

### `grok-bot` 桩约定

- 输入：`session`（线程/群 id）+ 可选 `hint`（「用刚才 PM 结论」「选中这几条」）  
- 产出：goal / decisions / constraints / open_questions / files_touched；**不**镜像全量群聊  
- `source.tool=grok-bot`；`producer` 建议 `mcp` 或 `manual`  
- 封闭边界：只导出用户显式触发的摘要范围

### 占位（claude-code / opencode）

```json
{
  "ok": false,
  "code": "unsupported",
  "message": "暂无导出"
}
```

有官方 export 后再把 `exportable` 改为 true 并实装。

## 与本地 API 对齐

- `POST /v1/export/{producer}` → 调 `adapters[producer].export(...)`  
- `producer` ∉ 注册表 → `404`  
- `unsupported` → `501` + message  
- 成功 → 走统一写盘（与 `PUT /v1/handoff` 相同扫描与 `supersedes`/`as_of` 规则）

## 防串台

- 每张卡自带 `source` + `as_of`；新卡可写 `supersedes`  
- 当前文件仅一张「现行」`HANDOFF.md`；旧卡进 `history/`  
- 消费方 ACK 记在 `status.json.consumers[]`，不改卡正文出处

## 非目标

- Adapter 内做 A2A / 实时双聊同步  
- 在桩阶段写解析代码（本文仅契约）

---

变更：2026-10-31 架构师 · Codex + grok-bot 桩契约；Claude/OpenCode 占位
