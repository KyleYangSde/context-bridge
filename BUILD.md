# Context Bridge — 开闸执行板

> 用户 2026-10-31 21:32+08「做」· 壳默认 **Capacitor 同皮**（Expo 冷藏）· 产品经理统筹通宵

## 目标验收（MVP）

同一张卡：PC 生成并上行 → iOS/手机壳打开 → 批准/驳回 → PC 托盘 status 更新。

场景 S1–S5 以 HANDOFF 生命周期为准。

## 并行分工

| Owner | 交付 | Done when |
|-------|------|-----------|
| 资深软开工程师 | fork `react-vite-capacitor-electron` + Electron 托盘；列表/详情/批准页；loopback `/v1` 客户端 | 双端壳可跑，mock 或真 API 都能点通批准流 |
| Agents软件架构师 | HANDOFF 解析器 + secrets_scan；状态机；Sync Relay 骨架 | 单元可测；Relay 四接口可用；假配对可通 |
| 资深UI设计师 | Cap 轨令牌/状态徽章/三屏规约 | 文档+示例进 `design/`，软开可直接贴 |
| 资深AI产品经理 | 验收标准、卡点补位、契约口径、夜间节奏 | 每晚对齐缺口；不因确认停工 |

## 契约源（权威）

- `HANDOFF.v1.md` · `LOCAL-API.v0.md` · `SYNC.v0.md` · `ADAPTER.v0.md`
- 壳：Capacitor 轨；托盘参考 sugarforever/rousan；不吞 ImpulseLog

## 节奏

1. T0：各自开仓/开码（本板发出即 T0）
2. T+2h：各自贴阶段性路径/截图到 BTCTeam
3. T+4h：联调 PC↔Relay↔手机批准
4. 阻塞：直接 @资深AI产品经理，产品侧当场拍或补契约

## 明确不做（MVP）

A2A 大 hub · raw transcript 同步 · iCloud 主路径 · Expo 双皮 · ImpulseLog 整仓

## 进度快照（2026-10-31 21:33+08）

- UI：D0 规约已交 `design/VISUAL.md` · `design/COMPONENTS.md`；`ui/` React 皮落地中
- 架构：`packages/core` + local `/v1` + Relay 骨架开跑
- 软开：Cloud Agent 按需用量拦住 → 改 box 在 `/workspace/context-bridge` 搭 Cap 同皮 + Electron 托盘 + mock 流
