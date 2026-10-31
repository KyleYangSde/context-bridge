# Context Bridge — 开源壳候选

> **产品锁（2026-10-31「做」）**：默认 **Capacitor 同皮** — fork `react-vite-capacitor-electron`；PC 托盘抄 sugarforever/rousan。**Expo 冷藏**（仅共享 core 时备选）。下列 Electron+Expo 分叉组合 superseded，仅归档参考。


> 原则：不从 0 做壳；要 **薄、可皮肤**；业务只叠 HANDOFF 预览 + Adapter + Relay。  
> **现行偏好（用户 2026-10-31）**：PC → **Electron** 托盘/menubar；手机 → **多端复用**（Expo/RN 或 Flutter），不以纯 SwiftUI 为唯一路径。  
> 状态：候选 · 工程最终 fork 由软开/架构拍板  
> 核实：WebSearch + GitHub API（stars / SPDX / pushed_at），Asia/Shanghai 2026-10-31

---

## 现行推荐 · Electron + 多端（优先）

### PC（Electron 托盘 / menubar / 小窗）

| 角色 | 候选 | 许可 | 活跃度（核实） | 一句话理由 |
|------|------|------|----------------|------------|
| **首选** | [romankurnovskii/electron-react-template](https://github.com/romankurnovskii/electron-react-template) | MIT | ★~33 · pushed 2026-09 | React+TS+Vite+Tailwind **自带 System Tray**，薄、易接 loopback `/v1` |
| 备选 A | [electron-vite/electron-vite-react](https://github.com/electron-vite/electron-vite-react) + [maxogden/menubar](https://github.com/maxogden/menubar) | MIT + **BSD-2-Clause** | ★~2.4k / ★~6.8k · 均 2026 有推送 | 成熟脚手架 + 官方级 menubar 库；托盘自己拼一层 |
| 备选 B | [electron-react-boilerplate/electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) | MIT | ★~24k · pushed 2026-10 | 社区标杆、持续维护；需自行加 tray/小窗（非开箱 menubar） |

**不要当产品 fork**：完整剪贴板/通知聚合 App（域模型重、许可证常 GPL）；仅可参考交互。  
**UI 约束**：无 Dock 主窗、无对话 IDE；托盘左键 = HANDOFF 预览；右键 = 选来源 / 打开卡 / 退出。

### 手机（多端复用：iOS ∥ Android）

不以纯 SwiftUI 为唯一路径；MVP 列表 / 详情 / 批准驳回 / 推送。

| 角色 | 候选 | 许可 | 活跃度（核实） | 一句话理由 |
|------|------|------|----------------|------------|
| **首选** | [obytes/react-native-template-obytes](https://github.com/obytes/react-native-template-obytes) | MIT | ★~4.3k · pushed 2026-10 | Expo+TS+NativeWind+EAS，**iOS/Android 一套**；叠 List→Detail + `expo-notifications` 对齐 SYNC.v0 |
| 备选 A | [nkzw-tech/expo-app-template](https://github.com/nkzw-tech/expo-app-template) | MIT | ★~767 · pushed 2026-09 | 更薄的现代 Expo 默认；适合只要 Router/列表骨架时 |
| 备选 B | [kido-luci/flutter-starter-template](https://github.com/kido-luci/flutter-starter-template) | MIT | ★~34 · pushed 2026-10 | Flutter 多端 + Messaging/路由已接线；团队偏 Dart 时用 |

**推送**：壳内接 Expo Push / FCM（或 Relay→APNs）；勿 fork 重型 ToDo/社交整仓。旧 APNs-only demo 仅作参考，不作主壳。

### 推荐组合（给排期）

1. **PC**：fork `electron-react-template` → 换皮线框 + 调本地 `/v1`  
2. **Mobile**：fork `react-native-template-obytes` → Handoff 列表/详情/批准驳回 + 推送 token 注册到 Relay  
3. 视觉令牌两端共用（`design/wireframe-pc-tray.html`）

等「做」后软开建仓库，UI 出视觉规约贴壳。

---

## ~~旧节 · Tauri PC + SwiftUI iOS~~（superseded）

> **已 superseded**：用户要求 PC 走 Electron、手机多端复用。下列仅归档，勿再当默认底座。

### PC（Tauri 托盘 / Menu bar）— archived

| 候选 | 适合点 | 风险 | UI 建议 |
|------|--------|------|---------|
| [ahkohd/tauri-macos-menubar-app-example](https://github.com/ahkohd/tauri-macos-menubar-app-example) | Tauri v2 · React/TS · 菜单栏 popover · MIT | 偏 macOS | 若日后回 Tauri 再启用 |
| [jbolda/personal-tray-app](https://github.com/jbolda/personal-tray-app) | tray + 快捷键 + 通知 | star 少 | 跨 Win 托盘时备查 |
| [jondot/tauri-tray-app](https://github.com/jondot/tauri-tray-app) | shadcn/tailwind | 偏重 | 只借组件，不整仓 fork |

### iOS（纯 SwiftUI）— archived · 不作唯一路径

| 候选 | 适合点 | 用法 |
|------|--------|------|
| Apple List + NavigationStack | 系统原生 | 仅当需要 iOS 特化补丁时 |
| [banghuazhao/ios-push-notification-full-stack-demo](https://github.com/banghuazhao/ios-push-notification-full-stack-demo) | SwiftUI + APNs | 只抽推送路径参考，不主壳 |

---

## 核实备注

- `sugarforever/electron-boilerplate` README 写 MIT，但 GitHub **无 SPDX / LICENSE 文件** → 不进短名单。  
- `BullThistle/yerba-tray` MIT 但 2022 停更 → 不进。  
- `maxogden/menubar` 为 **BSD-2-Clause**（非 MIT/Apache，但仍宽松可商用）→ 仅作库搭配 MIT 脚手架。  
- `launchtodayhq/expo-push-notifications` README 称 MIT，API 无 license → 不作主壳，推送可抄官方 Expo 文档。
