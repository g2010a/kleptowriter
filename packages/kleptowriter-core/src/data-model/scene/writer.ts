import type { SceneDocument } from "./types.js";

export async function writeScene(path: string, scene: SceneDocument): Promise<void> {
  await Bun.write(path, serializeScene(scene));
}

export function serializeScene(scene: SceneDocument): string {
  const { prose, customFields, ...frontmatter } = scene;
  return `---\n${serializeYaml({ ...frontmatter, ...customFields })}---\n${prose}`;
}

function serializeYaml(value: Record<string, unknown>, indent = 0): string {
  return Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .map(([key, item]) => serializeEntry(key, item, indent))
    .join("");
}

function serializeEntry(key: string, value: unknown, indent: number): string {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}${key}:\n`;
    return `${pad}${key}:\n${value.map((item) => `${pad}  - ${formatScalar(item)}\n`).join("")}`;
  }
  if (isRecord(value)) return `${pad}${key}:\n${serializeYaml(value, indent + 2)}`;
  return `${pad}${key}: ${formatScalar(value)}\n`;
}

function formatScalar(value: unknown): string {
  if (typeof value === "string") return needsQuotes(value) ? JSON.stringify(value) : value;
  return String(value);
}

function needsQuotes(value: string): boolean {
  return value === "" || /^[-?:,[\]{}#&*!|>'\"%@`\s]|\s$|:\s/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
