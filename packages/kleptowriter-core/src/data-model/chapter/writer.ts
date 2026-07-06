import { writeFileSync } from "node:fs";
import type { ChapterAssembly } from "./types.js";

function quote(value: string): string {
  return JSON.stringify(value);
}

function formatChapter(chapter: ChapterAssembly): string[] {
  const lines = [
    `- id: ${quote(chapter.id)}`,
    `  title: ${quote(chapter.title)}`,
    `  description: ${quote(chapter.description)}`,
    `  sortOrder: ${chapter.sortOrder}`,
  ];

  if (chapter.scenes.length === 0) {
    lines.push(`  scenes: []`);
  } else {
    lines.push(`  scenes:`);
    for (const sceneId of chapter.scenes) {
      lines.push(`    - ${quote(sceneId)}`);
    }
  }

  lines.push(`  type: ${chapter.type}`);
  return lines;
}

export function serializeChapters(chapters: ChapterAssembly[]): string {
  return `${chapters.flatMap(formatChapter).join("\n")}${chapters.length > 0 ? "\n" : ""}`;
}

export function writeChapters(path: string, chapters: ChapterAssembly[]): void {
  writeFileSync(path, serializeChapters(chapters), "utf8");
}
