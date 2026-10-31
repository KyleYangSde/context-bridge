import { access, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { constants } from "node:fs";
import type { ProducerAdapter, ExportRequest, AdapterResult } from "./types.js";
import { HANDOFF_SCHEMA } from "@context-bridge/core";
import {
  parseExportMarkdown,
  readUtf8File,
  sessionIdFromFile,
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
 * Codex producer adapter.
 * - BRIDGE_ADAPTER_MOCK=1 → synthetic handoff (unchanged smoke path)
 * - Prefer project `.codex-export.md` (UTF-8): handoff.v1 frontmatter or section heuristics
 * - ~/.codex/sessions alone → parse_error + TODO (no JSONL parser yet)
 */
export const codexAdapter: ProducerAdapter = {
  id: "codex",
  label: "Codex",
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
              tool: "codex",
              session_id: String(req.session ?? "mock-last"),
              producer: "cli",
            },
            as_of: asOf,
            goal: req.hint?.trim() || "[MOCK] Codex stub handoff — replace with real /export parser",
            decisions: ["Using Context Bridge file handoff (mock)"],
            constraints: ["No raw transcript", "secrets_scan must pass"],
            open_questions: ["Wire real Codex /export Markdown parser"],
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
            req.hint?.trim() || "Mock Codex export for Context Bridge smoke test.",
            "",
            "## Notes",
            "- Adapter stub: set `BRIDGE_ADAPTER_MOCK=0` and implement `/export` + `~/.codex/sessions` hooks.",
            "",
          ].join("\n"),
        },
        raw_ref: "mock://codex",
      };
    }

    const homeSessions = join(homedir(), ".codex", "sessions");
    const projectExportHint = join(req.project_root, ".codex-export.md");
    const hasSessions = await pathExists(homeSessions);
    const hasProjectExport = await pathExists(projectExportHint);

    if (hasProjectExport) {
      try {
        const markdown = await readUtf8File(projectExportHint);
        const as_of = new Date().toISOString();
        const session_id = await sessionIdFromFile(projectExportHint, req.session);
        const handoff = parseExportMarkdown(markdown, {
          tool: "codex",
          producer: "cli",
          session_id,
          as_of,
        });
        // Force adapter identity on heuristic path; keep file's tool if handoff.v1
        if (!handoff.frontmatter.source.tool) {
          handoff.frontmatter.source.tool = "codex";
        }
        return {
          ok: true,
          handoff,
          raw_ref: projectExportHint,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          code: "parse_error",
          message: `Codex .codex-export.md parse failed: ${msg}`,
        };
      }
    }

    if (!hasSessions) {
      return {
        ok: false,
        code: "not_found",
        message:
          "Codex export: no .codex-export.md in project and no ~/.codex/sessions. " +
          "Preferred hook: write `.codex-export.md` (handoff.v1 or Goal/Decisions sections). " +
          "Set BRIDGE_ADAPTER_MOCK=1 for a synthetic card.",
      };
    }

    let raw_ref: string = homeSessions;
    try {
      const entries = await readdir(homeSessions);
      if (entries.length) raw_ref = join(homeSessions, entries[0]);
    } catch {
      /* keep homeSessions */
    }

    return {
      ok: false,
      code: "parse_error",
      message:
        "Codex adapter: ~/.codex/sessions present but JSONL parser not implemented yet. " +
        `raw_ref=${raw_ref} session=${req.session ?? "last"}. ` +
        "TODO: implement JSONL → HANDOFF.v1; preferred path remains project `.codex-export.md`.",
    };
  },
};
