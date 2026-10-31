# Context Bridge — 组件规约（可贴 React / Capacitor）

对齐线框 `wireframe-pc-tray.html` · 业务对象 Handoff · 状态机见 VISUAL.md

## HandoffCard

**职责**：展示一张交接卡正文区（非 chat）。

| 区 | 字段 | 交互 |
|----|------|------|
| Header | `StateBadge` + `source.tool` · `session` 缩写 · 相对 `as_of` | 只读 |
| Goal | `goal` | PC 可轻编辑；Mobile 只读 |
| Decisions | `decisions[]` | 条列 |
| Constraints | `constraints[]` | 条列 |
| Open | `open_questions[]` | muted 标注 |
| Files | `files_touched[]` | mono 11px |
| Footer meta | `secrets_scan` · `ttl_hours` · `supersedes` | scan=fail 时整卡上方 danger banner |

**不做**：粘贴 raw transcript、思维链折叠区。

## SourcePicker

多向 producer：`grok-bot` | `codex` | `claude-code` | `opencode` | `other`  
- 托盘菜单或预览顶栏选择  
- 无导出能力的源：禁用 + 文案「暂无导出」（对齐 ADAPTER.v0）

## TrayPreview（PC）

布局同线框小窗：  
1. SourcePicker / 当前 source  
2. HandoffCard（可 edit goal）  
3. 主按钮「写入 .agent-bridge/HANDOFF.md」→ PUT  
4. 次按钮「换来源重新生成」  
5. ghost「复制路径」  
扫描失败：就地 banner，不关闭窗。

## MobileList

- 行：StateBadge + goal 一行 + source · 相对时间  
- 排序：现行 `pending_review` / `approved` 置顶；`superseded`/`expired` 沉底半透明  
- 点击 → MobileDetail

## MobileDetail

- 全量 HandoffCard（只读正文）  
- 若 `pending_review`：双按钮 `rejected` / `approved`  
  - rejected：必填 reason（单行/多行）后 PATCH status  
  - approved：确认后 PATCH；成功 toast「下游可当现行」  
- 不提供深编辑、不跑 Agent

## 共享约定

- 包名建议：`@context-bridge/ui` 或直接 `context-bridge/ui/src/components/*`  
- Capacitor WebView 与 Electron renderer **同一入口**；托盘窗用窄宽 CSS（`.tray-shell { max-width: 420px }`），手机用 `.mobile-shell`  
- 文案主中文；状态枚举保持英文 key（与 API 一致）

## 验收（设计）

- [ ] 八态徽章可辨且不靠颜色 alone（有文字）  
- [ ] 线框与组件一一对应（托盘三按钮、手机批准驳回）  
- [ ] S5 拒写可见；reject 无 reason 不可提交  
