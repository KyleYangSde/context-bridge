# Context Bridge

Local multi-agent **handoff** bus: structured `HANDOFF.v1` cards under `.agent-bridge/`, not a shared chat brain.

PC writes cards → Sync Relay → phone approves/rejects → tray status updates.

**License:** MIT · **MVP shell:** one React UI in Capacitor (iOS/Android) + Electron tray.

## What's in the box

| Path | Role |
|------|------|
| `packages/core` | Types, parse/serialize, `secretsScan`, state machine |
| `packages/adapters` | Producer adapters (Codex/Grok file export + mocks) |
| `packages/local-api` | PC loopback HTTP `127.0.0.1:17831` |
| `packages/relay` | Sync Relay default `0.0.0.0:17832` (LAN; APNs stub) |
| `ui/` | Shared React skin + Electron tray + Cap `android/` · `ios/` |
| `HANDOFF.v1.md` · `LOCAL-API.v0.md` · `SYNC.v0.md` · `ADAPTER.v0.md` | Contracts |
| `CAP-NATIVE.md` | Cap / device run notes |
| `ui/LIVE-WRITE.md` | Browser first-gate (tray → mobile approve) |

**Port rule:** PC / Electron / tray web → local-api `:17831` (+ Relay mirror). **Mobile / Cap → Relay `:17832` only** (never `:17831`).

## Quickstart

```bash
git clone https://github.com/KyleYangSde/context-bridge.git
cd context-bridge
npm install
npm run build
```

### Terminals

```bash
# 1) PC local API — creates .agent-bridge/.bridge-token (gitignored)
npm run start:local-api          # http://127.0.0.1:17831

# 2) Sync Relay
npm run start:relay              # bind 0.0.0.0:17832 — logs phone_url for Cap

# 3) Web UI (mock by default; toggle Live in header)
npm run dev:web                  # http://127.0.0.1:5173
# Tray:   ?shell=tray&mode=live
# Mobile: ?shell=mobile&mode=live
```

Wire the UI token once:

```bash
cp ui/.env.example ui/.env.development
# set VITE_BRIDGE_TOKEN=$(cat .agent-bridge/.bridge-token)
```

### API smoke (no UI)

With both servers up:

```bash
npm run smoke:first-gate
# expect: PASS … local=approved relay=approved
```

### Electron tray

```bash
npm run dev:electron             # needs a display (Xvfb on headless Linux)
```

### Capacitor (Android / iOS)

Platforms are already under `ui/android` and `ui/ios`. Phone talks **Relay only** — see `CAP-NATIVE.md`.

Relay defaults to **`0.0.0.0:17832`**. On the same Wi‑Fi as the phone, set Cap `VITE_RELAY_URL` to the printed `phone_url` (or `http://<your-LAN-IP>:17832`). Never use `:17831`. Loopback-only PC: `BRIDGE_RELAY_HOST=127.0.0.1 npm run start:relay`.

```bash
cd ui
cp .env.capacitor.example .env.production   # set VITE_RELAY_URL=http://<LAN-IP>:17832
npm run cap:sync
npm run cap:open:android   # or cap:open:ios on macOS
```

Full notes: [`CAP-NATIVE.md`](./CAP-NATIVE.md).

## Hard rules on write

1. `schema` must be `handoff.v1`
2. `secretsScan` fail → **422** (no write)
3. Status via state machine; `rejected` needs `reject_reason`
4. Only `approved` / `consumed` are “current” for consumers

## Security

Do **not** commit:

- `.agent-bridge/` (token, live `HANDOFF.md`, history)
- `ui/.env.development` / `.env.production` (real tokens)
- Android `local.properties`, keystores, `google-services.json`

Examples stay: `ui/.env.example`, `ui/.env.capacitor.example`.

## Specs

- [`HANDOFF.v1.md`](./HANDOFF.v1.md) — schema + state machine
- [`LOCAL-API.v0.md`](./LOCAL-API.v0.md) — PC loopback API
- [`SYNC.v0.md`](./SYNC.v0.md) — PC ∥ phone Relay
- [`ADAPTER.v0.md`](./ADAPTER.v0.md) — producer adapters
- [`design/`](./design/) — visual / component tokens

## MVP status

- [x] Core + local-api + Relay + first-gate smoke
- [x] Shared React UI (tray / mobile) + Electron menubar shell
- [x] Cap Android / iOS projects scaffolded
- [ ] Real device APNs (stub / push-log only)
- [ ] Store packaging / signed release builds
