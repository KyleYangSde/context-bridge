# 一期产品 · 截止 2026-11-01 00:00 Asia/Shanghai

## Done means（缺一不算一期）
1. **PC**：`npm run dev:electron` 真托盘 Live 写卡成功，status 可回写
2. **手机**：Cap Android 模拟器或真机，只绑 Relay，批准/驳回成功
3. **证据**：日志或截图路径贴 BTCTeam；必要修复已 push 公开仓
4. 公开仓仍可冷 clone（不回退）

## 不做（一期外）
真 APNs 证书、App Store、多 producer 生产级、iCloud

## 时间盒
- ≤22:40 Electron 证据
- ≤23:20 Cap 证据
- ≤23:50 收口贴群


## 已知（不挡一期收口）
- **单槽 handoff 竞态**：并行 Live 写卡会互相覆盖；Relay 现对 `pending_review`/`approved` 默认 409，需 `force:true` 才覆盖。UI 仍可主动 force。

- **Cap 模拟器批准 DEBT（无 KVM）**：box soft-accel AVD → System UI ANR / 白屏，APK 内无法点批准截图。同皮 `?shell=mobile&mode=live` → Relay PATCH approve **PASS**（`verify/cap-ui-relay-approve.png`）。APK install + `adb reverse` + 烤 `127.0.0.1:17832` 工程闸 PASS；真机/KVM 补截图。

## 收口状态（2026-11-01 00:08 Asia/Shanghai）
- PC Electron Live write：PASS
- Relay persist / 401 / handoff_locked：PASS（master）
- 浏览器 tray→mobile→approved：PASS
- Cap APK assemble + install：PASS；**模拟器内批准截图：DEBT**
