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
| Cap Android `assembleDebug` / emulator approve | **FAIL (box)** | No JDK; `apt` cannot install `openjdk-17` (Debian InRelease 500 / not signed). No `ANDROID_HOME` / `local.properties`. Emulator not runnable on this Linux box. |
| Cap iOS device | **N/A** | Needs macOS + Xcode |

## Electron Live write (how)

1. Services: `start:local-api`, Relay (0.0.0.0), `npm run dev -w @context-bridge/ui`
2. Sync `ui/.env.development` `VITE_BRIDGE_TOKEN` to **local-api’s** token file (`packages/local-api/.agent-bridge/.bridge-token`)
3. `CB_SHOW=1 CB_UI_URL='http://127.0.0.1:5173/?shell=tray&mode=live' electron electron/main.cjs --remote-debugging-port=9222`
4. In tray Live: set goal → **写入 .agent-bridge/** → green `已写入 · pending_review`

## Cap → Relay on Android emulator (user machine)

Blocker on this box: **JDK + Android SDK missing; apt broken for OpenJDK**.

On your Mac/Windows with Android Studio:

```bash
git clone https://github.com/KyleYangSde/context-bridge.git
cd context-bridge && npm i && npm run build
# PC: start local-api + Relay (must show bind 0.0.0.0:17832)
npm run start:local-api
npm run start:relay   # phone_url prints LAN IP

cd ui
# Emulator → host loopback alias for Relay (NOT :17831)
echo 'VITE_RELAY_URL=http://10.0.2.2:17832' > .env.production.local
npm run build && npx cap sync android
npx cap open android   # Run on emulator
```

- Phone/Cap talks **only** to Relay (`10.0.2.2:17832` on emulator, or PC LAN IP on a real device).
- Never point Cap at `127.0.0.1:17831` / local-api.
- Flow: PC tray Live write (+ Relay uplink) → emulator opens Cap → approve via Relay PATCH → tray status updates.

Real device on same LAN: set `VITE_RELAY_URL=http://<PC-LAN-IP>:17832` (box example `172.30.0.2`; your home PC will differ), rebuild + `cap sync`.

## Evidence paths (box)

- `verify/relay-lan.log` — Relay `0.0.0.0` + `phone_url`
- `verify/electron-tray.log` — Electron stdout + LIVE WRITE PASS note
- `verify/electron-tray-live-write.png` — tray Live write success screenshot
- `verify/electron-tray-before.png` — earlier tray load
- `verify/local-api.log` / `verify/vite.log`

## Notes

- Token for UI must match **running** local-api project root token (`packages/local-api/.agent-bridge/.bridge-token`), not a stale repo-root copy.
- `CB_SHOW=1` on Electron keeps the tray window visible for verify (skips blur-hide).
