import { readFileSync } from "node:fs";
import type { ChapterAssembly } from "./types.js";

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function stripComment(line: string): string {
  let inQuote = false;
  let quote = "";

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== "\\") {
      if (inQuote && quote === character) {
        inQuote = false;
        quote = "";
      } else if (!inQuote) {
        inQuote = true;
        quote = character;
      }
    }

    if (character === "#" && !inQuote) {
      return line.slice(0, index).trimEnd();
    }
  }

  return line.trimEnd();
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).replaceAll(`\\${first}`, first);
    }
  }

  return trimmed;
}

function parseScalar(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return unquote(trimmed);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid chapter: ${field} is required`);
  }
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid chapter: ${field} must be a number`);
  }
  return value;
}

function parseObjectLine(line: string): [string, string] {
  const separator = line.indexOf(":");
  if (separator < 0) {
    throw new Error(`Invalid YAML line: ${line}`);
  }

  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
}

export function readChapters(path: string): ChapterAssembly[] {
  const source = readFileSync(path, "utf8");
  if (source.trim().length === 0) {
    return [];
  }

  const lines = source.split(/\r?\n/).map(stripComment);
  const chapters: ChapterAssembly[] = [];
  let current: Record<string, unknown> | null = null;
  let inScenes = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (isBlank(line)) {
      continue;
    }

    if (line.startsWith("- ")) {
      if (current) {
        chapters.push(finalizeChapter(current));
      }
      current = {};
      inScenes = false;

      const remainder = line.slice(2).trim();
      if (remainder.length > 0) {
        const [key, value] = parseObjectLine(remainder);
        current[key] = parseScalar(value);
      }
      continue;
    }

    if (!current) {
      continue;
    }

    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ")) {
      if (!inScenes) {
        throw new Error("Invalid YAML: list item without scenes block");
      }
      const sceneId = unquote(trimmed.slice(2));
      const scenes = Array.isArray(current.scenes) ? current.scenes : [];
      scenes.push(sceneId);
      current.scenes = scenes;
      continue;
    }

    const [key, value] = parseObjectLine(trimmed);
    if (key === "scenes") {
      if (value === "[]") {
        current.scenes = [];
        inScenes = false;
        continue;
      }

      inScenes = value.length === 0;
      current.scenes = [];
      continue;
    }

    inScenes = false;
    current[key] = parseScalar(value);
  }

  if (current) {
    chapters.push(finalizeChapter(current));
  }

  return chapters;
}

function finalizeChapter(raw: Record<string, unknown>): ChapterAssembly {
  const id = requireString(raw.id, "id");
  const title = requireString(raw.title, "title");
  const sortOrder = requireNumber(raw.sortOrder, "sortOrder");
  const description = typeof raw.description === "string" ? raw.description : "";
  const scenes = Array.isArray(raw.scenes) ? raw.scenes.map((scene) => requireString(scene, "scene id")) : [];
  const type = raw.type === "interlude" || raw.type === "prologue" || raw.type === "epilogue" ? raw.type : "narrative";

  return { id, title, description, sortOrder, scenes, type };
}
