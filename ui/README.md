# Context Bridge — Shared React UI

Apple-simple skin for **one React DOM** shared by:

- **PC**: Electron tray / popover (menubar shell)
- **Mobile**: Capacitor (iOS + Android)

Business kernel: `HANDOFF.v1` lifecycle — not a chat IDE.

## Quick start

```bash
cd context-bridge/ui
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ for Electron & Capacitor
```

Demo toggle: **Desktop** (tray preview) | **Mobile** (list + approve/reject).

## Drop into Capacitor / Electron fork

Soft eng owns the shell fork (`react-vite-capacitor-electron` or equivalent). This package is the **shared UI** only.

Suggested layout after fork:

```
apps/shell/          # Electron main + tray + Capacitor wrappers
packages/ui/         # ← copy or workspace this folder
packages/core/       # types, state machine, Relay client (architecture)
```

### Wire-up checklist

1. Copy `src/` (or add as workspace package `@context-bridge/ui`).
2. Import `theme/tokens.css` once at app root.
3. Mount:
   - Tray popover → `<TrayPreview />` (or extract card + actions and bind to `PUT /v1/handoff`).
   - Capacitor routes → `<MobileList />` / `<MobileDetail />` against Relay `GET/PATCH /v1/handoff/status`.
4. Replace `src/data/mockHandoffs.ts` with API client from `packages/core`.
5. Keep **no raw transcript** views — only structured HANDOFF fields.

### Components

| Path | Role |
|------|------|
| `components/StateBadge.tsx` | All lifecycle pills |
| `components/HandoffCard.tsx` | Goal / decisions / constraints / questions / files / source / as_of |
| `components/SourcePicker.tsx` | Multi-source: grok-bot, codex, claude-code, opencode |
| `pages/TrayPreview.tsx` | PC generate → preview → write; scan-fail banner |
| `pages/MobileList.tsx` | Card list |
| `pages/MobileDetail.tsx` | Read-only body + approve / reject(+reason) |

### Design references

- Visual spec: [`../design/VISUAL.md`](../design/VISUAL.md)
- Wireframe: [`../design/wireframe-pc-tray.html`](../design/wireframe-pc-tray.html)
- Schema: [`../HANDOFF.v1.md`](../HANDOFF.v1.md)
- Local API: [`../LOCAL-API.v0.md`](../LOCAL-API.v0.md)
- Sync: [`../SYNC.v0.md`](../SYNC.v0.md)

## Hard UI rules

- `secrets_scan=fail` → show error, **refuse write**
- `rejected` → require `reject_reason`
- Only `approved` (then `consumed`) is “current” for consumers
- `superseded` / `expired` never shown as current truth

## Capacitor

Native projects: `android/`, `ios/` (see [`../CAP-NATIVE.md`](../CAP-NATIVE.md) and [`CAP.md`](./CAP.md)).

```bash
npm run cap:sync
npm run cap:open:android
```

Cap / `?shell=mobile` → **Relay `:17832` only**.

