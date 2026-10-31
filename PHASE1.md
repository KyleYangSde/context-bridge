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

- **box Cap 模拟器**：无可用 KVM → soft-accel ANR/白屏；同皮浏览器批准与工程装包仍 PASS。Gate B 已在家宽 Mac 补齐（见下）。

## 收口状态（2026-11-01 00:59 Asia/Shanghai）
- PC Electron Live write：PASS
- Relay persist / 401 / handoff_locked：PASS（master）
- 浏览器 tray→mobile→approved：PASS
- Cap APK assemble + install：PASS
- **Cap APK 模拟器批准（Gate B）**：PASS（家宽 Mac，非 box）

## 收口判定 · 2026-11-01 00:59 Asia/Shanghai（诚实）

### PASS
1. **PC Electron**：真托盘 Live 写卡 → `pending_review`（`verify/electron-tray-live-write.png`）
2. **协议 / Relay**：`0.0.0.0:17832`、磁盘持久化、`force:true` / `handoff_locked`、401 重配对
3. **同皮 mobile Live**：浏览器 `?shell=mobile&mode=live` 经 Relay 批准 → `approved`（`verify/cap-ui-relay-approve.png` + tray→mobile 链路）
4. **Cap 工程**：`assembleDebug` SUCCESS；APK 可 adb install；native 强制 live（`84fb661`）
5. **Gate B · Cap APK 模拟器批准**：家宽 Mac（`KyledeMacBook-Pro`）Relay + APK `bridge.context.app` → Live `pending_review` → 批准 → Relay `state=approved`（consumer=`cap-mobile`）。证据：本机 `~/context-bridge/verify/gateb-cap-approve.png`（烤 `10.0.2.2:17832` / `adb reverse` 路径见家宽记录）
6. **公开仓**：冷 clone + `smoke:first-gate` 不回退

### 仍不算 / 并行
- **box** 上 Cap 模拟器批准：仍 DEBT（无 KVM）——不挡一期，证据以家宽 Mac 为准。
- **Cap iOS / iPhone 12 WDA**：一期外并行，不宣称 iOS 原生验完。
- **真机 Android LAN**：可选增强，非 Gate B 硬门槛（模拟器已过）。

### 产品口径
一期 **PC + Cap Android 模拟器批准** 已齐。勿写成「双端原生全过」（iOS 未验）；勿把 box soft-accel 失败当成业务洞。
