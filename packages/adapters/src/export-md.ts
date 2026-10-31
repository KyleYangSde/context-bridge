import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  HANDOFF_SCHEMA,
  parseHandoffMarkdown,
  type HandoffDocument,
  type HandoffFrontmatter,
  type SourceProducer,
  type SourceTool,
} from "@context-bridge/core";

/** Section aliases → frontmatter keys (case-insensitive heading match). */
const SECTION_MAP: Array<{ key: keyof Pick<
  HandoffFrontmatter,
  "goal" | "decisions" | "constraints" | "open_questions" | "files_touched"
>; patterns: RegExp[] }> = [
  { key: "goal", patterns: [/^#{1,3}\s*goal\s*$/i] },
  { key: "decisions", patterns: [/^#{1,3}\s*decisions?\s*$/i] },
  { key: "constraints", patterns: [/^#{1,3}\s*constraints?\s*$/i] },
  {
    key: "open_questions",
    patterns: [/^#{1,3}\s*open\s+questions?\s*$/i, /^#{1,3}\s*questions?\s*$/i],
  },
  {
    key: "files_touched",
    patterns: [
      /^#{1,3}\s*files(?:\s+touched)?\s*$/i,
      /^#{1,3}\s*files?\s*$/i,
    ],
  },
];

export type ExportParseMeta = {
  tool: SourceTool;
  producer: SourceProducer;
  session_id: string;
  as_of: string;
};

/** True when markdown starts with YAML frontmatter that declares schema: handoff.v1 */
export function looksLikeHandoffV1(markdown: string): boolean {
  if (!markdown.startsWith("---")) return false;
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return false;
  const fm = markdown.slice(3, end);
  return /(?:^|\n)schema\s*:\s*['"]?handoff\.v1['"]?\s*(?:\n|$)/i.test(fm);
}

/**
 * Split markdown into ##-style sections. Returns map of known keys + leftover body.
 * List items (- / * / 1.) become array entries; Goal takes first non-empty paragraph.
 */
export function extractSections(markdown: string): {
  goal?: string;
  decisions: string[];
  constraints: string[];
  open_questions: string[];
  files_touched: string[];
  body: string;
} {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  type Bucket =
    | "goal"
    | "decisions"
    | "constraints"
    | "open_questions"
    | "files_touched"
    | "other";
  let current: Bucket = "other";
  const buckets: Record<Bucket, string[]> = {
    goal: [],
    decisions: [],
    constraints: [],
    open_questions: [],
    files_touched: [],
    other: [],
  };

  for (const line of lines) {
    const heading = line.trim();
    let matched: Bucket | null = null;
    for (const { key, patterns } of SECTION_MAP) {
      if (patterns.some((re) => re.test(heading))) {
        matched = key;
        break;
      }
    }
    if (matched) {
      current = matched;
      continue;
    }
    buckets[current].push(line);
  }

  const listItems = (block: string[]): string[] => {
    const out: string[] = [];
    for (const raw of block) {
      const t = raw.trim();
      if (!t) continue;
      const m = /^[-*+]\s+(.+)$/.exec(t) || /^\d+[.)]\s+(.+)$/.exec(t);
      if (m) out.push(m[1].trim());
      else if (!t.startsWith("#")) out.push(t);
    }
    return out;
  };

  const goalBlock = buckets.goal.map((l) => l.trim()).filter(Boolean);
  const goal = goalBlock.length ? goalBlock.join(" ").replace(/\s+/g, " ") : undefined;

  const other = buckets.other.join("\n").trim();
  const sectionBodies = (["decisions", "constraints", "open_questions", "files_touched"] as const)
    .map((k) => {
      const items = listItems(buckets[k]);
      if (!items.length) return "";
      const title =
        k === "files_touched"
          ? "Files"
          : k === "open_questions"
            ? "Open questions"
            : k.charAt(0).toUpperCase() + k.slice(1);
      return `## ${title}\n\n${items.map((i) => `- ${i}`).join("\n")}`;
    })
    .filter(Boolean);

  const bodyParts = [
    goal ? `## Goal\n\n${goal}` : "",
    ...sectionBodies,
    other ? `## Notes\n\n${other}` : "",
  ].filter(Boolean);

  return {
    goal,
    decisions: listItems(buckets.decisions),
    constraints: listItems(buckets.constraints),
    open_questions: listItems(buckets.open_questions),
    files_touched: listItems(buckets.files_touched),
    body: bodyParts.join("\n\n") + (bodyParts.length ? "\n" : ""),
  };
}

export function heuristicToHandoff(
  markdown: string,
  meta: ExportParseMeta,
): HandoffDocument {
  const sections = extractSections(markdown);
  const goal =
    sections.goal?.trim() ||
    markdown
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && !l.startsWith("---")) ||
    "(no goal extracted)";

  const fm: HandoffFrontmatter = {
    schema: HANDOFF_SCHEMA,
    source: {
      tool: meta.tool,
      session_id: meta.session_id,
      producer: meta.producer,
    },
    as_of: meta.as_of,
    goal,
    decisions: sections.decisions,
    constraints: sections.constraints,
    open_questions: sections.open_questions,
    files_touched: sections.files_touched,
    // secrets_scan left unset — local-api / relay store sets after scan
  };

  const body =
    sections.body.trim() ||
    `# Handoff\n\n## Goal\n\n${goal}\n`;

  return { frontmatter: fm, body };
}

/**
 * Prefer strict handoff.v1 frontmatter; else heuristic section parse.
 * On handoff.v1 success, force source.tool/producer from meta when missing,
 * and refresh as_of only if absent (parse requires as_of so keep file's).
 */
export function parseExportMarkdown(
  markdown: string,
  meta: ExportParseMeta,
): HandoffDocument {
  if (looksLikeHandoffV1(markdown)) {
    try {
      const doc = parseHandoffMarkdown(markdown);
      // Light normalize: keep file truth, ensure tool matches adapter if empty was impossible
      if (!doc.frontmatter.source.producer) {
        doc.frontmatter.source.producer = meta.producer;
      }
      return doc;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`handoff.v1 frontmatter present but invalid: ${msg}`);
    }
  }
  return heuristicToHandoff(markdown, meta);
}

export async function readUtf8File(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function sessionIdFromFile(
  path: string,
  reqSession?: string,
): Promise<string> {
  if (reqSession && reqSession !== "last") return String(reqSession);
  try {
    const st = await stat(path);
    return `${basename(path)}@${st.mtime.toISOString()}`;
  } catch {
    return String(reqSession ?? basename(path));
  }
}
