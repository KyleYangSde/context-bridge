import { access } from "node:fs/promises";
import { join } from "node:path";
import { constants } from "node:fs";
import type { ProducerAdapter, ExportRequest, AdapterResult } from "./types.js";
import { HANDOFF_SCHEMA } from "@context-bridge/core";
import {
  parseExportMarkdown,
  readUtf8File,
  sessionIdFromFile,
  heuristicToHandoff,
} from "./export-md.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Grok Bot producer adapter.
 * - BRIDGE_ADAPTER_MOCK=1 → synthetic handoff
 * - Prefer project `.grok-export.md` (structured mini-summary only — NEVER raw chat transcripts)
 * - Else `hint` starting with `summary:` → goal = first line, rest = body notes
 */
export const grokBotAdapter: ProducerAdapter = {
  id: "grok-bot",
  label: "Grok Bot",
  exportable: true,

  async export(req: ExportRequest): Promise<AdapterResult> {
    if (process.env.BRIDGE_ADAPTER_MOCK === "1") {
      const asOf = new Date().toISOString();
      return {
        ok: true,
        handoff: {
          frontmatter: {
            schema: HANDOFF_SCHEMA,
            source: {
              tool: "grok-bot",
              session_id: String(req.session ?? "mock-thread"),
              producer: "mcp",
            },
            as_of: asOf,
            goal: req.hint?.trim() || "[MOCK] Grok Bot stub handoff — explicit summary only",
            decisions: ["Multi-producer HANDOFF bus (mock)"],
            constraints: ["No raw chat mirror", "User-triggered export only"],
            open_questions: ["Wire Grok summary/selected-messages → fields"],
            files_touched: [],
            commands: [],
            supersedes: null,
            ttl_hours: 72,
            secrets_scan: "pass",
          },
          body: [
            "# Handoff",
            "",
            "## Goal",
            req.hint?.trim() || "Mock Grok Bot export for Context Bridge smoke test.",
            "",
            "## Notes",
            "- Stub only: never mirror full group transcripts.",
            "",
          ].join("\n"),
        },
        raw_ref: "mock://grok-bot",
      };
    }

    // Never ingest raw chat transcripts — only explicit export files or summary: hints.
    const projectExport = join(req.project_root, ".grok-export.md");
    const hasExport = await pathExists(projectExport);
    const as_of = new Date().toISOString();
    const session_id = String(req.session ?? "grok-thread");

    if (hasExport) {
      try {
        const markdown = await readUtf8File(projectExport);
        const sid = await sessionIdFromFile(projectExport, req.session);
        const handoff = parseExportMarkdown(markdown, {
          tool: "grok-bot",
          producer: "mcp",
          session_id: sid,
          as_of,
        });
        return {
          ok: true,
          handoff,
          raw_ref: projectExport,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          code: "parse_error",
          message: `Grok .grok-export.md parse failed: ${msg}`,
        };
      }
    }

    const hint = req.hint?.trim() ?? "";
    if (hint.toLowerCase().startsWith("summary:")) {
      const summary = hint.slice("summary:".length).trim();
      if (!summary) {
        return {
          ok: false,
          code: "not_found",
          message: "Grok hint `summary:` is empty after prefix strip.",
        };
      }
      const lines = summary.split(/\n/).map((l) => l.trim()).filter(Boolean);
      const goal = lines[0] ?? summary;
      const rest = lines.slice(1).join("\n");
      const synthetic = [
        `## Goal`,
        "",
        goal,
        "",
        rest ? `## Notes\n\n${rest}` : "",
        "",
        "## Constraints",
        "",
        "- Explicit summary only — no raw chat transcript",
        "",
      ]
        .filter((x) => x !== undefined)
        .join("\n");

      const handoff = heuristicToHandoff(synthetic, {
        tool: "grok-bot",
        producer: "mcp",
        session_id,
        as_of,
      });
      // Ensure goal wins even if section parse is thin
      handoff.frontmatter.goal = goal;
      if (!handoff.frontmatter.constraints.includes("Explicit summary only — no raw chat transcript")) {
        handoff.frontmatter.constraints = [
          "Explicit summary only — no raw chat transcript",
          ...handoff.frontmatter.constraints,
        ];
      }
      return {
        ok: true,
        handoff,
        raw_ref: "hint://summary",
      };
    }

    return {
      ok: false,
      code: "not_found",
      message:
        "Grok Bot export: no `.grok-export.md` in project and no `hint` starting with `summary:`. " +
        "Only structured mini-summaries are accepted — never raw chat transcripts. " +
        "Set BRIDGE_ADAPTER_MOCK=1 for synthetic card.",
    };
  },
};
