# 双端同步一页（PC ∥ iOS）— v0 拍板

> 等「做」开码 · 密钥细节 1:1，不进群  
> 卡：`HANDOFF.v1` · 本机写：`.agent-bridge/` · iOS：只读正文 + 改 status + 推送

## 二选一建议（拍板）

| | **自托管 Relay（推荐 · MVP 默认）** | iCloud Drive（备选） |
|---|---|---|
| 模型 | PC/iOS → 同一小 HTTPS 服务；只存现行卡 + status + 设备推送令牌 | PC 写进 iCloud 容器目录；iOS 读文件 |
| 推送 | APNs 一等公民 | 弱（靠静默拉/BG）；难以及时「新交接」 |
| status 回写 | `PATCH` 语义清晰、可审计 | 文件合并易冲突 |
| 密钥 | 用户自控部署；配对码/设备 token | 依赖 Apple 账号与容器权限 |
| 工程 | 多一个薄服务，与 `/v1` 同形 | 少服务，但双端文件监听/冲突要自己扛 |

**决定：MVP 走自托管 Relay。** iCloud 不作主路径；若用户拒绝任何中继，可降级「仅 PC」或后续再加 iCloud 只读镜像。

不做：局域网扫 PC `17831`、无同意默认同步、raw transcript 上云。

## 数据流

```
Adapter/壳 ─写─► PC `.agent-bridge/HANDOFF.md` + status.json
                      │ 用户开启同步后上行
                      ▼
              Sync Relay（现行卡 + status）
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   PC 壳（可再拉 status）    iOS（GET 卡 / PATCH approved·rejected / APNs）
```

- 正文权威：PC 写入且 `secrets_scan=pass`，按较新 `as_of`（可带 `supersedes`）  
- 状态权威：最后一次合法 `PATCH`（`pending|acked|rejected` + `consumer` + 时间）  
- iOS **不** `PUT` 正文

## 同步协议（与 LOCAL-API 同形）

Relay 暴露（鉴权后）：

| 方法 | 路径 | PC | iOS |
|---|---|---|---|
| GET | `/v1/handoff` | ✅ | ✅ |
| PUT | `/v1/handoff` | ✅（上行） | ❌ |
| GET/PATCH | `/v1/handoff/status` | ✅ | ✅（`approved`/`rejected`+reason） |
| POST | `/v1/devices` | ✅ | ✅（注册 APNs） |

鉴权：设备配对（短码一次）→ 每端 refreshable token；**禁止**复用 PC 本地 `.bridge-token` 到手机。

载荷：仅 HANDOFF frontmatter+body 与 status JSON；体积小；上行前再扫一次密钥。


## 状态机（与 HANDOFF 一致）

双端只同步 **现行卡 + status**：`draft` 默认同不上行；`ready` 起可上行；iOS 主要操作 `pending_review → approved|rejected`（`reject_reason` 必填）；PC/Agent 可标 `consumed`；新卡写入使旧卡 `superseded`。

详见 `HANDOFF.v1.md`「业务状态机」。PATCH `/v1/handoff/status` 体：`{ "state", "reject_reason?", "consumer?" }`。

## 并行开工依赖

- 软开/UI：按此契约分 PC ∥ iOS，不阻塞选云厂商细节  
- 架构/软开 D1：Relay 骨架（内存/SQLite 现行卡即可）+ 配对假门  
- 推送：D1 可先本地通知占位，APNs 证书私聊配置  

## 验收

同一张卡：PC 生成并上行 → iOS 打开 → 批准/驳回 → PC 托盘 status 更新。

---

关联：`HANDOFF.v1.md` · `LOCAL-API.v0.md` · `ADAPTER.v0.md` · `design/wireframe-pc-tray.html`  
变更：2026-10-31 架构师 · 双端同步一页；**默认自托管 Relay，iCloud 备选不进 MVP 主路径**

补：2026-10-31 状态机与业务对象对齐 HANDOFF.v1
