# Context Bridge — Visual Spec

> Shared skin for Electron tray + Capacitor. Sparse · Apple-simple · premium.

## Tokens (`ui/src/theme/tokens.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--cb-bg` | `#f5f5f7` | Page / desktop wash |
| `--cb-surface` | `#ffffff` | Cards, windows |
| `--cb-ink` | `#1d1d1f` | Primary text |
| `--cb-muted` | `#86868b` | Secondary / labels |
| `--cb-accent` | `#0071e3` | Primary actions |
| `--cb-radius` | `14px` | Panels |
| `--cb-radius-pill` | `999px` | Buttons, chips, badges |
| `--cb-shadow` | soft elevated | Tray window only |
| Font | system / SF Pro stack | No custom display face |

## States (must always be labeled)

| State | Feel |
|-------|------|
| `draft` | Neutral gray |
| `ready` | Soft blue |
| `pending_review` | Warm amber |
| `approved` | Green |
| `rejected` | Red |
| `consumed` | Purple |
| `superseded` | Muted gray |
| `expired` | Brown / warm mute |

Use `StateBadge` — do not invent ad-hoc colors per screen.

## Layout

- **PC tray**: ~420px popover; source chips → actions → card → state legend
- **Mobile**: list rows (tool + badge + goal clamp) → detail (card + approve/reject)
- Density: generous padding; one primary action per cluster

## Do

- Show `source.tool` + `as_of` on every card
- Banner on `secrets_scan=fail` before write
- Require reason field when rejecting
- Chinese primary copy; EN ok in section titles

## Don’t

- Raw transcript / chat bubbles / IDE chrome
- Dense multi-column dashboards
- Auto-play Agent orchestration canvases
- Put secrets or `.env` samples in mock data

## Wireframe

Open [`wireframe-pc-tray.html`](./wireframe-pc-tray.html) for the static PC ∥ iOS board this UI implements.
