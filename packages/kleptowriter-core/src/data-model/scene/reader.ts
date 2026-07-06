import { SceneStatus } from "../../types/index.js";
import type { SceneDocument, SceneMetadata, SceneReadResult } from "./types.js";

type ParsedYaml = Record<string, unknown>;
type FrontmatterResult = { ok: true; yaml: string; body: string } | { ok: false; error: string };

const metadataDefaults = (): SceneMetadata => ({
  characters: [],
  locations: [],
  plotThreads: [],
  thematicMotifs: [],
  dramaticQuestions: [],
});

export async function readScene(path: string): Promise<SceneReadResult> {
  try {
    return parseScene(await Bun.file(path).text());
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function parseScene(content: string): SceneReadResult {
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter.ok) return frontmatter;

  const yaml = parseYaml(frontmatter.yaml);
  if (!yaml.ok) return yaml;

  const document = toSceneDocument(yaml.data, frontmatter.body);
  return document.ok ? { ok: true, data: document.data } : document;
}

function extractFrontmatter(content: string): FrontmatterResult {
  if (!content.startsWith("---")) return { ok: false, error: "Missing frontmatter" };

  const firstLineEnd = content.indexOf("\n");
  const yamlStart = firstLineEnd === -1 ? content.length : firstLineEnd + 1;
  const delimiter = content.indexOf("\n---", yamlStart);
  if (delimiter === -1) return { ok: false, error: "Missing closing frontmatter delimiter" };

  const delimiterEnd = content.indexOf("\n", delimiter + 1);
  return {
    ok: true,
    yaml: content.slice(yamlStart, delimiter),
    body: delimiterEnd === -1 ? "" : content.slice(delimiterEnd + 1),
  };
}

function parseYaml(yaml: string): { ok: true; data: ParsedYaml } | { ok: false; error: string } {
  const root: ParsedYaml = {};
  const stack: Array<{ indent: number; value: ParsedYaml | unknown[] }> = [{ indent: -1, value: root }];
  const lines = yaml.replaceAll("\r\n", "\n").split("\n");

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const raw = lines[lineNumber] ?? "";
    if (!raw.trim()) continue;
    if (raw.trimStart().startsWith("#")) continue;

    const indent = raw.match(/^ */)?.[0].length ?? 0;
    const text = raw.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) stack.pop();
    const parent = stack[stack.length - 1]!.value;

    if (text.startsWith("- ")) {
      if (!Array.isArray(parent)) return { ok: false, error: `Malformed frontmatter line ${lineNumber + 1}` };
      parent.push(parseScalar(text.slice(2)));
      continue;
    }

    const separator = text.indexOf(":");
    if (separator === -1) return { ok: false, error: `Malformed frontmatter line ${lineNumber + 1}` };
    if (Array.isArray(parent)) return { ok: false, error: `Malformed frontmatter line ${lineNumber + 1}` };

    const key = text.slice(0, separator).trim();
    const value = text.slice(separator + 1).trim();
    if (!key) return { ok: false, error: `Malformed frontmatter line ${lineNumber + 1}` };

    if (value) {
      parent[key] = parseScalar(value);
      continue;
    }

    const next = nextContentLine(lines, lineNumber + 1);
    const child: ParsedYaml | unknown[] = next?.trim().startsWith("- ") ? [] : {};
    parent[key] = child;
    stack.push({ indent, value: child });
  }

  return { ok: true, data: root };
}

function nextContentLine(lines: string[], start: number): string | undefined {
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (line?.trim()) return line;
  }
  return undefined;
}

function parseScalar(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

function toSceneDocument(data: ParsedYaml, prose: string): SceneReadResult {
  if (typeof data.id !== "string") return { ok: false, error: "Scene id is required" };
  if (typeof data.title !== "string") return { ok: false, error: "Scene title is required" };
  if (typeof data.status !== "number" || !Object.values(SceneStatus).includes(data.status)) {
    return { ok: false, error: "Scene status is required" };
  }

  const metadata = readMetadata(data.metadata);
  if (!metadata.ok) return metadata;

  const { id, title, status, metadata: _metadata, ...customFields } = data;
  return {
    ok: true,
    data: {
      id,
      title,
      status,
      metadata: metadata.data,
      prose,
      customFields,
    },
  };
}

function readMetadata(value: unknown): { ok: true; data: SceneMetadata } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, data: metadataDefaults() };
  if (!isRecord(value)) return { ok: false, error: "Scene metadata must be an object" };

  return {
    ok: true,
    data: {
      ...metadataDefaults(),
      pov: asOptionalString(value.pov),
      characters: asStringArray(value.characters),
      locations: asStringArray(value.locations),
      chronology: asOptionalString(value.chronology),
      tension: typeof value.tension === "number" ? value.tension : undefined,
      mood: asOptionalString(value.mood),
      plotThreads: asStringArray(value.plotThreads),
      thematicMotifs: asStringArray(value.thematicMotifs),
      dramaticQuestions: asStringArray(value.dramaticQuestions),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
