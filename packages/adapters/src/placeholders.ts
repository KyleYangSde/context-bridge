import type { ProducerAdapter, AdapterResult } from "./types.js";

function unsupported(id: string, label: string): ProducerAdapter {
  return {
    id,
    label,
    exportable: false,
    async export(): Promise<AdapterResult> {
      return {
        ok: false,
        code: "unsupported",
        message: "暂无导出",
      };
    },
  };
}

export const claudeCodeAdapter = unsupported("claude-code", "Claude Code");
export const opencodeAdapter = unsupported("opencode", "OpenCode");
