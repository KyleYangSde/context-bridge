# Cap native — Relay contract (MVP)

iOS / Android Cap shells talk **only** to Relay `:17832`. Never bind the phone to PC local-api `:17831`.

## Pairing

```http
POST /v1/devices
{ "role": "ios", "label": "iphone", "apns_token": "<token-or-omit>" }
```

Store returned `token` as `Authorization: Bearer …`. Re-POST with `apns_token` to get stub `device_registered`. Real APNs certs later; Relay logs `[relay-apns-stub]` + `GET /v1/push-log`.

## Review loop

1. PC uplinks Relay `PUT /v1/handoff` (PC device token).
2. Phone `GET /v1/handoff` + `PATCH /v1/handoff/status` `{ "state": "approved"|"rejected" }` — iOS **cannot** PUT body.
3. Tray mirrors / polls until resolved.

## Deep link (sketch)

`contextbridge://handoff?as_of=<ISO>` → open review. Cap `appUrlOpen` / Android intent; ignore unknown hosts.

## Permissions

- **Push Notifications** → `apns_token` on register.
- No Local Network / PC reachability for MVP (Relay is the phone’s only peer).

## Soft-eng

`npx cap add ios|android` after first-gate; Cap server URL = reachable Relay host, not `127.0.0.1:17831`.
