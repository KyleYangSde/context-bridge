# Context Bridge — PC 壳本地 API 草图（v0）

> 状态：架构草图 · 无实现代码 · 数据源仍是仓库内 HANDOFF.v1 文件  
> 壳：倾向 Tauri；本 API 为壳与 CLI/MCP 的契约，**文件为真相源**

## 原则

1. **Single source of truth**：`.agent-bridge/HANDOFF.md`（及可选历史 `HANDOFF.<as_of>.md`）  
2. 壳只做读/写/状态/触发导出；**不**另建会话库镜像 transcript  
3. PC 默认本机 loopback；不做公网暴露；**iOS 与 PC 同步开工**，经 Sync Relay（见 `SYNC.v0.md`），不直连家宽 `17831`  
4. 写路径必跑 `secrets_scan`；`fail` → 拒写并返回错误

## 传输

| 项 | MVP |
|---|---|
| 绑定 | `127.0.0.1` only |
| 协议 | HTTP JSON（Tauri 亦可同构 IPC，路径一致） |
| 端口 | 可配置，默认 `17831` |
| 鉴权 | MVP：本地 token 文件 `.agent-bridge/.bridge-token`（进程外只读）；无 token 拒写 |
| CORS | 仅允许壳 origin；CLI 用 localhost |

## 资源模型

```
ProjectRoot (用户选定仓库)
  └── .agent-bridge/
        HANDOFF.md          # 当前卡（handoff.v1）
        history/            # 可选：归档
        status.json         # 消费状态（壳维护，可 gitignore）
        .bridge-token       # 本地鉴权（必 gitignore）
```

`status.json` 示例：

```json
{
  "current_as_of": "2026-10-31T21:20:00+08:00",
  "state": "pending_review",
  "consumers": [],
  "updated_at": "2026-10-31T21:20:00+08:00"
}
```

`state`：`draft` | `ready` | `pending_review` | `approved` | `rejected` | `consumed` | `superseded` | `expired`（见 HANDOFF.v1 状态机；旧 pending/acked 分别映射 pending_review/consumed）

## 端点（草图）

### `GET /health`
→ `{ "ok": true, "version": "0.0", "project_root": "..." }`

### `GET /v1/handoff`
读当前 `.agent-bridge/HANDOFF.md`  
→ `{ "frontmatter": { ...handoff.v1 }, "body": "...", "path": "...", "status": { ... } }`  
无文件 → `404`

### `PUT /v1/handoff`
体：`{ "frontmatter": {...}, "body": "..." }` 或 `{ "markdown": "整文件" }`  
行为：校验 `schema=handoff.v1` → secrets_scan → 原子写 `HANDOFF.md` → 可选把旧卡移入 `history/` → `state=pending`  
→ `200` + 新 status；scan fail → `422 { "error": "secrets_scan_failed", "hits": [...] }`

### `GET /v1/handoff/status` · `PATCH /v1/handoff/status`
壳/下游按状态机转移；`rejected` 必带 `reject_reason`；可带 `consumer`；仅 `approved`（及之后的 `consumed`）为现行  
手机「批准/驳回」最终也走同一状态机（经 sync 代理，非直连 PC）

### `POST /v1/export/{producer}`
`producer`：`codex` | `claude-code` | `opencode` | `grok-bot` | `manual` | …（可插拔）  
体：`{ "session": "last" | "<id>", "hint": "可选自然语言摘要入口" }`  
行为：**只触发**该 producer 的导出适配器 → 规范化成 HANDOFF.v1 → 写入并 `pending`  
返回：`{ "job_id": "...", "state": "queued" }`（或同步完成直接返回 handoff）  
**本阶段不写适配器实现**；MVP 可先落地 1～2 个 producer，契约按多向预留。

### `PUT /v1/handoff`（再强调）
任意端（含 Grok 侧脚本/MCP、人工粘贴）都可直接 PUT 一张卡；不强制走 `/export/*`。

### `GET /v1/projects` · `POST /v1/projects/open`
多仓库：壳维护「最近打开的 project_root 列表」；当前工作区切换

## 与 HANDOFF.v1 / 壳 / 手机的边界

```
Codex / Claude / OpenCode / Grok / … 
        │ 各 producer 适配器（可插拔）或直接 PUT
        ▼
   HANDOFF.md  ←── 文件真相源（方向无关）
        ▲
PC 壳 / CLI / MCP ── /v1/handoff* 
        │
任一 consumer：Read 文件 或 GET handoff（Claude、Codex、Grok、OpenCode…）
手机：只读 sync + 批准/驳回 status
```

| 端 | 读 HANDOFF | 写 HANDOFF | 改 status |
|---|---|---|---|
| PC 壳 | ✅ | ✅（预览编辑） | ✅ |
| CLI `bridge` | ✅ | ✅ | ✅ |
| 任意 Coding Agent / Grok | ✅（文件或 GET） | ✅（export 适配器或 PUT） | 可选 ack |
| 手机 MVP | ✅（同步副本） | ❌ 全文 | ✅ 批准/驳回 |

## 非目标

- 云端「共享大脑」、实时双端编辑同一卡  
- 在 API 层存 raw transcript  
- 手机直连用户家宽上的 `17831`（NAT/安全噩梦）→ 必须经用户显式 sync 通道  

## 验收对齐（产品）

- PC：壳打开仓库 → 显示当前卡 →（日后）一键 export → Claude 读到同文件  
- 本草图交付物：契约文档；**无服务代码**

---

变更：2026-10-31 架构师初稿；多向 producer；iOS/PC 并行见 SYNC.v0.md；状态机对齐业务生命周期
