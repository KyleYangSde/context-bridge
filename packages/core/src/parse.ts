import matter from "gray-matter";
import yaml from "js-yaml";
import {
  HANDOFF_SCHEMA,
  type HandoffDocument,
  type HandoffFrontmatter,
} from "./types.js";

export class HandoffParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandoffParseError";
  }
}

function asStringArray(v: unknown, field: string): string[] {
  if (v == null) return [];
  if (!Array.isArray(v)) {
    throw new HandoffParseError(`${field} must be an array`);
  }
  return v.map((x) => String(x));
}

function normalizeFrontmatter(data: Record<string, unknown>): HandoffFrontmatter {
  const schema = String(data.schema ?? "");
  if (schema !== HANDOFF_SCHEMA) {
    throw new HandoffParseError(`schema must be "${HANDOFF_SCHEMA}", got "${schema}"`);
  }
  const sourceRaw = data.source;
  if (!sourceRaw || typeof sourceRaw !== "object") {
    throw new HandoffParseError("source is required");
  }
  const src = sourceRaw as Record<string, unknown>;
  if (!src.tool || !src.session_id) {
    throw new HandoffParseError("source.tool and source.session_id are required");
  }
  const as_of = data.as_of;
  if (!as_of || typeof as_of !== "string") {
    throw new HandoffParseError("as_of is required (ISO-8601 string)");
  }
  const goal = data.goal;
  if (!goal || typeof goal !== "string") {
    throw new HandoffParseError("goal is required");
  }

  const fm: HandoffFrontmatter = {
    schema: HANDOFF_SCHEMA,
    source: {
      tool: String(src.tool),
      session_id: String(src.session_id),
      ...(src.producer != null ? { producer: String(src.producer) } : {}),
    },
    as_of,
    goal,
    decisions: asStringArray(data.decisions, "decisions"),
    constraints: asStringArray(data.constraints, "constraints"),
    open_questions: asStringArray(data.open_questions, "open_questions"),
    files_touched: asStringArray(data.files_touched, "files_touched"),
  };

  if (data.commands != null) fm.commands = asStringArray(data.commands, "commands");
  if ("supersedes" in data) fm.supersedes = (data.supersedes as string | null) ?? null;
  if (data.ttl_hours != null) fm.ttl_hours = Number(data.ttl_hours);
  if (data.secrets_scan === "pass" || data.secrets_scan === "fail") {
    fm.secrets_scan = data.secrets_scan;
  }

  return fm;
}

/** Parse markdown with YAML frontmatter into HandoffDocument */
export function parseHandoffMarkdown(markdown: string): HandoffDocument {
  const parsed = matter(markdown, {
    engines: {
      yaml: {
        parse: (s: string) => yaml.load(s) as object,
        stringify: (o: object) =>
          yaml.dump(o, { lineWidth: 100, noRefs: true, sortKeys: false }),
      },
    },
  });
  const data = (parsed.data ?? {}) as Record<string, unknown>;
  return {
    frontmatter: normalizeFrontmatter(data),
    body: (parsed.content ?? "").replace(/^\n/, ""),
  };
}

/** Serialize HandoffDocument to markdown with YAML frontmatter */
export function serializeHandoff(doc: HandoffDocument): string {
  const { frontmatter, body } = doc;
  const yamlStr = yaml.dump(
    {
      schema: frontmatter.schema,
      source: frontmatter.source,
      as_of: frontmatter.as_of,
      goal: frontmatter.goal,
      decisions: frontmatter.decisions ?? [],
      constraints: frontmatter.constraints ?? [],
      open_questions: frontmatter.open_questions ?? [],
      files_touched: frontmatter.files_touched ?? [],
      ...(frontmatter.commands ? { commands: frontmatter.commands } : {}),
      ...(frontmatter.supersedes !== undefined
        ? { supersedes: frontmatter.supersedes }
        : {}),
      ...(frontmatter.ttl_hours != null ? { ttl_hours: frontmatter.ttl_hours } : {}),
      ...(frontmatter.secrets_scan ? { secrets_scan: frontmatter.secrets_scan } : {}),
    },
    { lineWidth: 100, noRefs: true, sortKeys: false },
  );
  const bodyClean = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `---\n${yamlStr.trimEnd()}\n---\n\n${bodyClean}\n`;
}

/** Build document from separate frontmatter + body (API PUT shape) */
export function fromParts(
  frontmatter: HandoffFrontmatter,
  body: string,
): HandoffDocument {
  return {
    frontmatter: normalizeFrontmatter(frontmatter as unknown as Record<string, unknown>),
    body,
  };
}

export function validateFrontmatter(fm: unknown): HandoffFrontmatter {
  if (!fm || typeof fm !== "object") {
    throw new HandoffParseError("frontmatter must be an object");
  }
  return normalizeFrontmatter(fm as Record<string, unknown>);
}
