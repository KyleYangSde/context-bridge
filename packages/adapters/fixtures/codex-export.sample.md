# Codex export sample (heuristic — no YAML)

## Goal
Ship Context Bridge first-gate: tray write → mobile approve.

## Decisions
- Prefer `.codex-export.md` over ~/.codex JSONL
- Keep BRIDGE_ADAPTER_MOCK for CI smoke

## Constraints
- No raw transcript in the card
- secrets_scan runs in local-api / relay store

## Open questions
- When to add JSONL session parser?

## Files
- packages/adapters/src/codex.ts
- packages/adapters/src/export-md.ts
