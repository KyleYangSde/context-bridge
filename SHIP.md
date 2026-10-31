# Ship — public GitHub product

## Who it's for
Developers running multiple local coding agents who need a **structured handoff card** (not a shared chat brain) across PC tray + phone approve/reject.

## Outsider Quick start
```bash
git clone <repo>
cd context-bridge
npm install
npm run build
npm run start:local-api   # :17831 — creates .agent-bridge/.bridge-token
npm run start:relay       # :17832
npm run smoke:first-gate  # must PASS
cd ui && npm install && npm run build && npm run dev:web
# Live demo: http://127.0.0.1:5173/?shell=tray&mode=live
# Mobile viewport: ?shell=mobile&mode=live — phone builds only talk to Relay :17832
```

## Product surface
- PC: Electron tray + local-api writer
- Phone: Capacitor shell, Relay-only
- Core: HANDOFF.v1 lifecycle + secrets_scan refuse-on-fail

## Do not ship
- `.agent-bridge/.bridge-token`, real APNs certs, raw transcripts, private keys

## Native Cap
See [`CAP-NATIVE.md`](./CAP-NATIVE.md) — `ui/android` + `ui/ios` scaffolded; phone → Relay `:17832` only.
