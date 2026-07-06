import { WikiPageType, type WikiPage } from "./types.js";

type ParseResult = { ok: true; data: WikiPage } | { ok: false; error: string };

const FRONTMATTER_DELIMITER = "---";

export async function parseWikiPage(path: string): Promise<ParseResult> {
  try {
    const content = await Bun.file(path).text();
    return parseWikiPageContent(content, path);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to read wiki page" };
  }
}

export function parseWikiPageContent(content: string, path = ""): ParseResult {
  try {
    const { frontmatter, body } = splitFrontmatter(content);

    return {
      ok: true,
      data: {
        type: parsePageType(frontmatter.type),
        name: parseString(frontmatter.name) ?? fallbackName(path),
        aliases: parseStringArray(frontmatter.aliases),
        tags: parseStringArray(frontmatter.tags),
        relatedPages: parseStringArray(frontmatter.relatedPages),
        frontmatter,
        body,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Malformed wiki page" };
  }
}

function splitFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const firstLine = lines[0];

  if (firstLine !== FRONTMATTER_DELIMITER) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line === FRONTMATTER_DELIMITER);
  if (endIndex === -1) {
    throw new Error("Malformed wiki page: missing closing frontmatter delimiter");
  }

  const frontmatterText = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");

  return { frontmatter: parseYamlFrontmatter(frontmatterText), body };
}

function parseYamlFrontmatter(text: string): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {};
  let pendingListKey: string | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      continue;
    }

    const listItem = /^\s+-\s*(.*)$/.exec(line);
    if (listItem) {
      if (pendingListKey === null) {
        throw new Error("Malformed wiki frontmatter: list item without a key");
      }

      const existing = frontmatter[pendingListKey];
      if (!Array.isArray(existing)) {
        throw new Error(`Malformed wiki frontmatter: ${pendingListKey} is not a list`);
      }

      existing.push(parseScalar(listItem[1] ?? ""));
      continue;
    }

    if (pendingListKey !== null) {
      const pendingValue = frontmatter[pendingListKey];
      if (Array.isArray(pendingValue) && pendingValue.length === 0) {
        frontmatter[pendingListKey] = "";
      }

      pendingListKey = null;
    }

    const field = /^([A-Za-z][\w-]*):(?:\s*(.*))?$/.exec(line);
    if (!field) {
      throw new Error(`Malformed wiki frontmatter line: ${line}`);
    }

    const key = field[1];
    if (key === undefined) {
      throw new Error(`Malformed wiki frontmatter line: ${line}`);
    }

    const value = field[2] ?? "";
    if (value === "") {
      frontmatter[key] = [];
      pendingListKey = key;
      continue;
    }

    frontmatter[key] = parseScalar(value);
  }

  if (pendingListKey !== null) {
    const pendingValue = frontmatter[pendingListKey];
    if (Array.isArray(pendingValue) && pendingValue.length === 0) {
      frontmatter[pendingListKey] = "";
    }
  }

  return frontmatter;
}

function parseScalar(value: string): string | string[] | boolean | number | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => String(parseScalar(item)).trim())
      .filter(Boolean);
  }

  const unquoted = /^['"](.*)['"]$/.exec(trimmed)?.[1];
  if (unquoted !== undefined) {
    return unquoted;
  }

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;

  const numericValue = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(numericValue)) {
    return numericValue;
  }

  return trimmed;
}

function parsePageType(value: unknown): WikiPageType {
  if (typeof value === "string" && Object.values(WikiPageType).includes(value as WikiPageType)) {
    return value as WikiPageType;
  }

  return WikiPageType.Concept;
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function fallbackName(path: string): string {
  const fileName = path.split(/[\\/]/).pop() ?? "";
  const name = fileName.replace(/\.[^.]*$/, "");
  return name || "Untitled";
}
