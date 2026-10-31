# Context Bridge — 开源壳短名单（可 fork）

> 调研日：2026-10-31（Asia/Shanghai）  
> 原则：不从 0 搭 Tauri/iOS 脚手架；壳要薄，业务只叠 HANDOFF.v1 + Sync Relay；许可优先 MIT/Apache/BSD/Unlicense。  
> 数据来源：GitHub API（stars / SPDX license / `pushed_at`）+ README；WebFetch 对部分页返回不完整，以 API 为准。

相关草稿：`HANDOFF.v1.md` · `LOCAL-API.v0.md` · `ADAPTER.v0.md` · `SYNC.v0.md` · `design/wireframe-pc-tray.html` · `SHELL-CANDIDATES.md`（UI 初筛，本文为工程核实版）。

---

## PC 端（托盘 / 菜单栏小窗）

需求对齐：托盘/菜单栏、可调 loopback HTTP、读写本地文件；优先 Tauri（轻、本地权限清晰）；Electron / Swift MenuBar 作备选。

### 1. [ahkohd/tauri-macos-menubar-app-example](https://github.com/ahkohd/tauri-macos-menubar-app-example) — **PC 默认推荐**

| 项 | 值 |
|----|-----|
| Stars | ~389 |
| License | **MIT**（`LICENSE.md`） |
| 最近推送 | 2026-09-19（`chore: modernize v2`） |
| 栈 | Tauri v2 + React + TypeScript + Vite；另有 `v2-popover` 分支 |

**为何合适**  
菜单栏图标 + 点击出小窗/popover，形态与线框「托盘 → 预览窗」一致；示例够薄，便于剥 demo、接 `GET/PUT /v1/handoff` 与「选来源」UI。

**风险**  
名义与文档偏 **macOS**；Windows/Linux 托盘行为需自测/补强。依赖 `tauri-nspanel` 一类 macOS 技巧时，跨平台要裁剪。

### 2. [kitlib/tauri-app-template](https://github.com/kitlib/tauri-app-template) — **PC 备选（跨端更全）**

| 项 | 值 |
|----|-----|
| Stars | ~100 |
| License | **MIT** |
| 最近推送 | 2026-03-20 |
| 栈 | Tauri v2 + React 19 + TS + shadcn/ui；含 **System Tray**、全局快捷键、多窗、自动更新脚手架 |

**为何合适**  
比纯 menubar demo 更「产品模板」：托盘 + 现代前端组件，接 HANDOFF 预览/编辑成本低；跨平台意图更明确。

**风险**  
功能面偏全（i18n、自定义标题栏、release pipeline），fork 后要主动删胖，避免做成「又一个桌面 IDE」。stars 仍不高，社区验证有限。

### 3. [jbolda/personal-tray-app](https://github.com/jbolda/personal-tray-app)

| 项 | 值 |
|----|-----|
| Stars | ~16 |
| License | **MIT** |
| 最近推送 | 2024-05-29 |
| 栈 | Tauri v2；JS / Rust 双实现；tray + 全局快捷键 + 通知；GitHub Template |

**为何合适**  
官方 Template 形态，目标就是「后台 + 托盘/快捷键」启动器，和 Context Bridge PC 壳 overlap 高。

**风险**  
活跃度与 stars 偏低；若 Tauri v2 API 有漂移，升级成本落在我们身上。

### 4. [gitify-app/gitify](https://github.com/gitify-app/gitify)（Electron 路径）

| 项 | 值 |
|----|-----|
| Stars | ~5394 |
| License | **MIT** |
| 最近推送 | 2026-10-29 |
| 栈 | Electron + React + 菜单栏；跨 macOS/Win/Linux |

**为何合适**  
成熟菜单栏产品：托盘、小窗、设置、通知都验证过；若坚持 Electron 或要强跨端，可当「壳参考 / 硬 fork 再删域模型」。

**风险**  
Git 通知业务重，剥离成本大；包体与安全面大于 Tauri。**不当默认底座**，仅作 Electron 备胎。

### 5. 参考（不当整仓 fork）

| 仓库 | 备注 |
|------|------|
| [maxogden/menubar](https://github.com/maxogden/menubar) | ~6781★ · **BSD-2-Clause** · 2026-07 仍活跃 · **库不是 App**；选 Electron 时作依赖 |
| [4gray/tauri-menubar-app](https://github.com/4gray/tauri-menubar-app) | ~131★ · README 写 MIT 但 **无 LICENSE 文件 / API license=null** · 停更于 2023 · **许可风险，不推荐 fork** |
| [jondot/tauri-tray-app](https://github.com/jondot/tauri-tray-app) | ~114★ · license 不明 · 2023 停 · 仅可抄片段 |
| [stevenselcuk/Barmaid](https://github.com/stevenselcuk/Barmaid) / [kyan/kyan-bar](https://github.com/kyan/kyan-bar) | Swift MenuBar · MIT · 适合「纯 macOS 原生」路线；与 Tauri 双栈成本高，MVP 不优先 |

**PC 默认选型**  
1. **首选**：`ahkohd/tauri-macos-menubar-app-example`（对线框最快）  
2. **备选**：`kitlib/tauri-app-template`（要 Win/Linux 托盘与组件库时）

本地能力：壳内用 Tauri `http`/`fs`/`shell` 调 `127.0.0.1` Relay + 读写项目下 `.agent-bridge/`（权限声明写进 capabilities，不进群密钥）。

---

## iOS 端（列表 + 详情 + 批准/驳回 + REST + 推送）

需求对齐：不跑本机 Agent；读 Sync Relay；列表/详情；批准/驳回改 status；推送占位可进 MVP。

完整「交接卡」开源壳几乎没有 → 选 **SwiftUI 列表/详情 + REST** 骨架，推送从样板嫁接。

### 1. [nativeapptemplate/NativeAppTemplate-Free-iOS](https://github.com/nativeapptemplate/NativeAppTemplate-Free-iOS) — **iOS 默认推荐**

| 项 | 值 |
|----|-----|
| Stars | ~106 |
| License | **MIT** |
| 最近推送 | 2026-10-30 |
| 栈 | 100% SwiftUI · `@Observable` · MVVM · 对接自托管 REST（Rails 示例可换）· CRUD 列表/详情 |

**为何合适**  
现成「列表 → 详情 → 写操作」与我们对接 Relay（`GET` 卡 / `PATCH` status）同构；活跃、MIT、可剥 Auth/Shop 域换成 HANDOFF 字段。

**风险**  
自带 Sign-up/CRUD 业务与默认 API 域名需清掉；推送需另接（见下）。比「空白 List」重一点，但比社交客户端轻得多。

### 2. [tunds/SwiftUI-Navigation-Multiplatform-Example](https://github.com/tunds/SwiftUI-Navigation-Multiplatform-Example) — **iOS 备选（导航 + 推送）**

| 项 | 值 |
|----|-----|
| Stars | ~161 |
| License | **MIT** |
| 最近推送 | 2023-04-25 |
| 栈 | NavigationStack / NavigationSplitView · Deep link · **FCM 推送** |

**为何合适**  
双栏导航 + 推送深链与「新交接推送 → 打开详情」匹配；可作推送/路由参考或次选底座。

**风险**  
停更约 3 年；Firebase 绑定（可改 APNs 直连对齐 `SYNC.v0`）；不是生产 CRUD 模板。

### 3. [apple/sample-food-truck](https://github.com/apple/sample-food-truck)

| 项 | 值 |
|----|-----|
| Stars | ~1848 |
| License | **MIT** |
| 最近推送 | 约 2023（API `pushed_at` 2023-08；有效提交偏 2023-02） |
| 栈 | WWDC22 SwiftUI 多样例 · NavigationSplitView · 多平台 |

**为何合适**  
官方级列表/侧栏/详情结构，简约、许可干净，适合「UI 主壳」抄结构。

**风险**  
无 REST/推送；停更；Live Activity 等与 MVP 无关需删。

### 4. [moasq/iOSJumpstart](https://github.com/moasq/iOSJumpstart)

| 项 | 值 |
|----|-----|
| Stars | ~18 |
| License | **MIT** |
| 最近推送 | 2026-01-05 |
| 栈 | SwiftUI + Supabase + Firebase 推送 + RevenueCat 等 |

**为何合适**  
推送与后端脚手架「开箱」；若团队已定 Supabase 作 Relay 宿主可加速。

**风险**  
支付/Auth 过重，和「薄壳」冲突；stars 低。建议 **只抽推送模块**，不整仓当产品。

### 5. 推送补丁 / 勿用

| 仓库 | 备注 |
|------|------|
| [banghuazhao/ios-push-notification-full-stack-demo](https://github.com/banghuazhao/ios-push-notification-full-stack-demo) | MIT · APNs + SwiftUI + token API · **0★** · 宜 **摘代码** 接到默认壳，不当主 fork |
| [Dimillian/IceCubesApp](https://github.com/Dimillian/IceCubesApp) | ~7k★ · **AGPL-3.0** · **不 fork**（传染） |
| NetNewsWire 等阅读器 | MIT 且活跃，但域模型过重，违背「薄壳」 |

**iOS 默认选型**  
1. **首选**：`NativeAppTemplate-Free-iOS`（列表/详情/REST 写操作）  
2. **备选**：`tunds/SwiftUI-Navigation-Multiplatform-Example`（要先钉导航+推送时）；或 Food Truck 结构 + banghuazhao APNs 片段组合  

推送与 `SYNC.v0`：MVP 自托管 Relay + APNs；FCM 仅作开发参考。

---

## 建议落地组合（给排期）

| 端 | 默认 fork | 备选 | 我们叠的一层 |
|----|-----------|------|----------------|
| PC | ahkohd menubar example | kitlib tauri-app-template | 选来源 Adapter · HANDOFF 预览 · loopback `/v1` · 写 `.agent-bridge/` |
| iOS | NativeAppTemplate-Free-iOS | tunds nav+push 样板 | 卡列表/详情 · 批准/驳回 → PATCH status · APNs 打开详情 |

**明确不做**：从零 `create-tauri-app` / 空 Xcode 工程当主路径；fork AGPL 社交客户端；fork 重型 ToDo/剪贴板全家桶当壳。

等用户回「做」后：@资深软开工程师 按上表建 fork 仓；@资深UI设计师 按 `wireframe-pc-tray.html` 换皮；架构继续 Relay 契约。

---

## 核实摘要

| 仓库 | Stars≈ | SPDX | 最近活动 | 结论 |
|------|--------|------|----------|------|
| ahkohd/tauri-macos-menubar-app-example | 389 | MIT | 2026-09 | PC 首选 |
| kitlib/tauri-app-template | 100 | MIT | 2026-03 | PC 备选 |
| jbolda/personal-tray-app | 16 | MIT | 2024-05 | 可并列 |
| gitify-app/gitify | 5394 | MIT | 2026-10 | Electron 备胎 |
| 4gray/tauri-menubar-app | 131 | 不明 | 2023 | 勿作主 fork |
| nativeapptemplate/NativeAppTemplate-Free-iOS | 106 | MIT | 2026-10 | iOS 首选 |
| tunds/SwiftUI-Navigation-… | 161 | MIT | 2023-04 | iOS 备选（推送） |
| apple/sample-food-truck | 1848 | MIT | 2023 | 结构参考 |
| IceCubesApp | 7097 | AGPL-3.0 | 活跃 | 禁用 |
