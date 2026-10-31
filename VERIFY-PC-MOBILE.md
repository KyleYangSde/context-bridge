# PC + Mobile verification (Asia/Shanghai)

Verified on box `2026-10-31` ~22:00 UTC+8. Repo: [KyleYangSde/context-bridge](https://github.com/KyleYangSde/context-bridge).

## PASS / FAIL matrix

| Gate | Result | Evidence |
|------|--------|----------|
| `npm run smoke:first-gate` | **PASS** | CLI: `local=approved` / `relay=approved` |
| local-api `:17831` | **PASS** | Listening; Bearer from `packages/local-api/.agent-bridge/.bridge-token` |
| Relay bind `0.0.0.0:17832` | **PASS** | `verify/relay-lan.log` → `bind: http://0.0.0.0:17832`, `phone_url: http://172.30.0.2:17832` |
| Vite tray/mobile HTML | **PASS** | `GET :5173/?shell=tray\|mobile&mode=live` → 200 + `#root` |
| Electron Live tray **write card** | **PASS** | `verify/electron-tray.log` + `verify/electron-tray-live-write.png` — UI banner `已写入 · state → pending_review`; local-api goal `Electron Live verify write 2026-10-31T13:58:06.869Z` |
| Cap mobile shell binds Relay only | **PASS (code)** | `ui/src/App.tsx`: Cap / `?shell=mobile` → Relay `:17832` only, never `:17831` |
| Cap Android `assembleDebug` / emulator approve | **PARTIAL** | assembleDebug+install PASS; guest net DOWN → `adb reverse` + bake `127.0.0.1:17832`. Soft-accel ANR → no Cap APK approve shot. **Cap UI same shell** (`?shell=mobile&mode=live`) Relay approve **PASS** → `verify/cap-ui-relay-approve.png`, Relay `state=approved`. APK gate B still needs KVM host/device. |
| Cap iOS device | **N/A** | Needs macOS + Xcode |

## Electron Live write (how)

1. Services: `start:local-api`, Relay (0.0.0.0), `npm run dev -w @context-bridge/ui`
2. Sync `ui/.env.development` `VITE_BRIDGE_TOKEN` to **local-api’s** token file (`packages/local-api/.agent-bridge/.bridge-token`)
3. `CB_SHOW=1 CB_UI_URL='http://127.0.0.1:5173/?shell=tray&mode=live' electron electron/main.cjs --remote-debugging-port=9222`
4. In tray Live: set goal → **写入 .agent-bridge/** → green `已写入 · pending_review`

## Cap → Relay on Android emulator

### Box status (2026-10-31 ~22:55 Asia/Shanghai)

| Step | Result |
|------|--------|
| SDK `/workspace/android-sdk` + `local.properties` | PASS |
| JDK | Temurin **21** at `/tmp/jdk-21` (Cap needs 21; 17 fails `invalid source release: 21`) |
| `VITE_RELAY_URL` | Prefer `http://10.0.2.2:17832` (never `:17831`). Box guest net was down → tried `adb reverse` + `127.0.0.1:17832` only as fallback |
| `npm run build && npx cap sync android` | PASS |
| `./gradlew assembleDebug` | **PASS** — APK `ui/android/app/build/outputs/apk/debug/app-debug.apk` |
| `adb install -r` | PASS (`verify/cap-android-install.log`) |
| Emulator AVD `cb_api34` | Booted (~11 min TCG). Nested KVM unusable (`dmesg` `kvm_spurious_fault`) → must `-accel off` |
| Cap UI Live approve via Relay | **FAIL** — System/Pixel Launcher ANR; Cap process intermittent; no Cap device approve; Relay handoff left `pending_review` |

Do **not** mark Phase-1 gate B (Cap approve) PASS on this box. Re-run on a host with working KVM / Android Studio emulator:

```bash
git clone https://github.com/KyleYangSde/context-bridge.git
cd context-bridge && npm i && npm run build
npm run start:local-api
npm run start:relay   # bind 0.0.0.0:17832 — phone_url for LAN

cd ui
echo 'VITE_RELAY_URL=http://10.0.2.2:17832' > .env.production.local
echo 'VITE_API_MODE=live' >> .env.production.local
npm run build && npx cap sync android
# write android/local.properties: sdk.dir=<ANDROID_HOME>
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n bridge.context.app/.MainActivity
# PC tray Live write → Cap Live → Approve → Relay state=approved
```

- Phone/Cap → **Relay `:17832` only** (`10.0.2.2` on emulator, or PC LAN IP on device).
- Never point Cap at `:17831` / local-api.


## Evidence paths (box)

- `verify/relay-lan.log` — Relay `0.0.0.0` + `phone_url`
- `verify/electron-tray.log` — Electron stdout + LIVE WRITE PASS note
- `verify/electron-tray-live-write.png` — tray Live write success screenshot
- `verify/electron-tray-before.png` — earlier tray load
- `verify/local-api.log` / `verify/vite.log`

## Notes

- Token for UI must match **running** local-api project root token (`packages/local-api/.agent-bridge/.bridge-token`), not a stale repo-root copy.
- `CB_SHOW=1` on Electron keeps the tray window visible for verify (skips blur-hide).


### Midnight supplement (2026-11-01 ~00:08 Asia/Shanghai)

- PM path: `adb reverse tcp:17832 tcp:17832`; guest `10.0.2.2` Network unreachable (eth0/wlan0 DOWN); rebuilt APK with `VITE_RELAY_URL=http://127.0.0.1:17832` and reinstalled.
- Cap APK on `cb_api34` (`-accel off`): splash → white screen / System UI ANR; WebView CDP often times out. Nested KVM (`-accel on`) hangs offline (CPU ~0%).
- Cap **UI** Relay approve (identical React mobile shell via vite preview + headless Chrome): Live → 批准 → banner `live · relay approved`; Relay handoff `state=approved`. Evidence: `verify/cap-ui-relay-approve.png`.
- Phase-1 gate B (Cap **APK** emulator approve screenshot): still **open** on box; unblock on machine with working KVM or a physical device.
