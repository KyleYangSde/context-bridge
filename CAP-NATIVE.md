# Cap native — Relay contract (MVP)

iOS / Android Cap shells talk **only** to Sync Relay. Never bind the phone to PC local-api `:17831`.

## Start Relay for devices (LAN)

```bash
# default bind is 0.0.0.0:17832 (override with BRIDGE_RELAY_HOST=127.0.0.1 for loopback-only)
npm run start:relay
# logs bind + phone_url, e.g. http://192.168.1.23:17832
```

Find LAN IP if needed:

- macOS: `ipconfig getifaddr en0`
- Linux: `hostname -I | awk '{print $1}'`

Phone / simulator / Cap must use **`http://<LAN-IP>:17832`** (same Wi‑Fi; open firewall for TCP 17832). Box/cloud IPs like `172.30.x.x` only work if the phone routes there — prefer the laptop’s home/office LAN IP when Cap runs on a real device next to the user’s PC.

## Cap config

Set `VITE_RELAY_URL=http://<LAN-IP>:17832` (or Cap `server.url` / env the shell already uses). Do **not** point Cap at `:17831`.

CORS: Relay reflects Cap origins (`capacitor://localhost`, `ionic://localhost`, `http(s)://localhost`) and private-LAN `http(s)://…` origins.

## Pairing

```http
POST /v1/devices
{ "role": "ios", "label": "iphone", "apns_token": "<device-token-or-omit>" }
```

Store returned `token` as `Authorization: Bearer …`. Real APNs later; stub events in `GET /v1/push-log`.

## Review loop

1. PC / tray → local-api write → Relay `PUT /v1/handoff` (PC device token).
2. Phone `GET /v1/handoff` + `PATCH /v1/handoff/status` `{ "state": "approved"|"rejected" }` — **cannot** PUT body.
3. Tray polls / mirrors until resolved.

## Deep link (sketch)

`contextbridge://handoff?as_of=<ISO>` → open review (`appUrlOpen` / Android intent).

## Permissions

- Push Notifications → `apns_token` on register.
- Local Network may be required on iOS 14+ to reach LAN Relay; allow when prompted.

## Emulator networking (box / nested VM)

Default emulator path: bake `VITE_RELAY_URL=http://10.0.2.2:17832` so the guest reaches the host’s Relay.

When guest NICs are down (`ip link` shows `eth0`/`wlan0` **DOWN**, or `curl http://10.0.2.2:17832` → Network unreachable):

1. On the **host** (where Relay listens):  
   `adb reverse tcp:17832 tcp:17832`
2. Rebuild Cap with loopback:  
   `VITE_RELAY_URL=http://127.0.0.1:17832` → `npm run build && npx cap sync android` → `assembleDebug` → `adb install -r`
3. Cap WebView then hits `127.0.0.1:17832` inside the guest; adb reverse tunnels to the host Relay.

Do **not** point Cap at local-api `:17831`. Prefer `10.0.2.2` when guest net works; use reverse + `127.0.0.1` only as the DOWN-NIC fallback. Real devices still use the PC’s LAN IP `:17832`.
