import type { ProducerAdapter } from "./types.js";
import { codexAdapter } from "./codex.js";
import { grokBotAdapter } from "./grok-bot.js";
import { claudeCodeAdapter, opencodeAdapter } from "./placeholders.js";

export const adapters: Record<string, ProducerAdapter> = {
  codex: codexAdapter,
  "grok-bot": grokBotAdapter,
  "claude-code": claudeCodeAdapter,
  opencode: opencodeAdapter,
};

export function getAdapter(id: string): ProducerAdapter | undefined {
  return adapters[id];
}

export function listAdapters(): ProducerAdapter[] {
  return Object.values(adapters);
}
