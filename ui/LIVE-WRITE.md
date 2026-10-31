# Live write → approve (first acceptance)

## Flags / env
- UI: `?mode=live` or header **Live** toggle (default mock via `VITE_API_MODE`)
- Token (PC only): `ui/.env.development` → `VITE_BRIDGE_TOKEN` (from `.agent-bridge/.bridge-token`)
- Optional: `VITE_LOCAL_API_URL` (PC), `VITE_RELAY_URL` (PC + Cap)

## Binding rules
| Shell | Backend |
|-------|---------|
| tray / demo desktop | **local-api `:17831`** (+ best-effort Relay mirror) |
| `?shell=mobile` / Cap native | **Relay `:17832` only** (no local-api) |

## Browser demo
1. `npm run start:local-api` → `:17831`
2. `npm run start:relay` → `:17832`
3. `npm run dev:web` → http://127.0.0.1:5173/?mode=live
4. **Desktop / tray**: pick source → **写入** → `PUT :17831/v1/handoff` → Relay `PUT` with `force:true` (slot locked in `pending_review`/`approved` returns 409 `handoff_locked` otherwise)
5. **Mobile view in demo chrome**: may still mirror via App paths used in demo; for Cap-accurate path use `?shell=mobile&mode=live` (Relay GET/PATCH only)
6. Banner / tray status → `approved`

Tray-only: http://127.0.0.1:5173/?shell=tray&mode=live  
Mobile Cap-path: http://127.0.0.1:5173/?shell=mobile&mode=live

API smoke: `npm run smoke:first-gate` from repo root.

## Cap device
See [`../CAP-NATIVE.md`](../CAP-NATIVE.md). Emulator + `adb reverse`: bake `VITE_RELAY_URL=http://127.0.0.1:17832` and **`VITE_API_MODE=live`** (native also forces live in `App.tsx`). Then `npm run build && npx cap sync` / assembleDebug.

## Changed paths
- `ui/src/pages/TrayPreview.tsx` — live PUT + Relay + review (PC)
- `ui/src/App.tsx` — mobile shell = Relay-only; Cap native forces `shell=mobile`
- `ui/src/api/client.ts` / `relay.ts` — local-api vs Relay clients
