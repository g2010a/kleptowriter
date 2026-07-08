import { defineTool } from "@earendil-works/pi-coding-agent";
import { readdir, readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseScene, ChapterDeductor } from "@kleptowriter/kleptowriter-core";
import type { SceneDocument } from "@kleptowriter/kleptowriter-core";
import { DeduceChaptersParamsSchema } from "./types.js";
import type { DeduceChaptersResult, DeduceChaptersChapter, DeduceChaptersActBreakdown } from "./types.js";

const DEFAULT_SCENES_DIR = "./story/scenes";
const CHAPTERS_YAML_PATH = "./story/chapters.yaml";

function okResult(result: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
    details: result,
  };
}

async function atomicWrite(targetPath: string, content: string): Promise<void> {
  const dir = join(targetPath, "..");
  await mkdir(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${process.pid}`;
  await writeFile(tmp, content, "utf-8");
  await rename(tmp, targetPath);
}

// ponytail: manual YAML serialization for flat structure; no dependency needed
function chaptersToYaml(result: DeduceChaptersResult): string {
  const lines: string[] = ["chapters:"];
  for (const ch of result.chapters) {
    lines.push(`  - chapterNumber: ${ch.chapterNumber}`);
    lines.push(`    title: "${ch.title}"`);
    lines.push(`    scenes:`);
    for (const s of ch.scenes) {
      lines.push(`      - ${s}`);
    }
    lines.push(`    summary: "${ch.summary.replace(/"/g, '\\"')}"`);
  }
  if (result.actBreakdown && result.actBreakdown.length > 0) {
    lines.push("actBreakdown:");
    for (const act of result.actBreakdown) {
      lines.push(`  - act: ${act.act}`);
      lines.push(`    chapters:`);
      for (const n of act.chapters) {
        lines.push(`      - ${n}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

function inferAct(beatSlug: string): string {
  if (beatSlug === "setup" || beatSlug === "prologue") return "act-1";
  if (beatSlug.startsWith("rising")) return "act-2";
  if (beatSlug === "climax") return "act-3";
  if (beatSlug === "falling" || beatSlug === "resolution") return "act-4";
  return "act-unknown";
}

function deriveActBreakdown(chapters: DeduceChaptersChapter[], allScenes: SceneDocument[]): DeduceChaptersActBreakdown[] | undefined {
  const sceneToBeat = new Map<string, string>();
  for (const s of allScenes) {
    const parts = s.id.split("-");
    if (parts.length >= 3) sceneToBeat.set(s.id, parts[0]!);
  }

  const actMap = new Map<string, number[]>();
  for (const ch of chapters) {
    const actsInChapter = new Set<string>();
    for (const sid of ch.scenes) {
      const beat = sceneToBeat.get(sid);
      if (beat) actsInChapter.add(inferAct(beat));
    }
    for (const act of actsInChapter) {
      if (!actMap.has(act)) actMap.set(act, []);
      actMap.get(act)!.push(ch.chapterNumber);
    }
  }

  if (actMap.size === 0) return undefined;
  return [...actMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([act, chapterNumbers]) => ({ act, chapters: chapterNumbers }));
}

export const deduceChaptersTool = defineTool({
  name: "deduce_chapters",
  label: "Deduce Chapters",
  description:
    "Scans all written scenes, deduces chapter groupings based on narrative " +
    "structure, and persists results to story/chapters.yaml.",
  parameters: DeduceChaptersParamsSchema,
  execute: async (_toolCallId, _params) => {
    let entries;
    try {
      entries = await readdir(DEFAULT_SCENES_DIR, { withFileTypes: true });
    } catch {
      const result: DeduceChaptersResult = { chapters: [] };
      return okResult(result);
    }

    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
    if (mdFiles.length === 0) {
      const result: DeduceChaptersResult = { chapters: [] };
      return okResult(result);
    }

    const scenes: SceneDocument[] = [];
    for (const entry of mdFiles) {
      const raw = await readFile(join(DEFAULT_SCENES_DIR, entry.name), "utf-8");
      const parsed = parseScene(raw);
      if (parsed.ok) scenes.push(parsed.data);
    }

    scenes.sort((a, b) => a.id.localeCompare(b.id));

    const deductor = new ChapterDeductor();
    const candidates = deductor.deduce(scenes);

    const chapters: DeduceChaptersChapter[] = candidates.map((c, i) => ({
      chapterNumber: i + 1,
      title: c.title,
      scenes: c.sceneIds,
      summary: c.breakReason,
    }));

    const result: DeduceChaptersResult = {
      chapters,
      actBreakdown: deriveActBreakdown(chapters, scenes),
    };

    await atomicWrite(CHAPTERS_YAML_PATH, chaptersToYaml(result));

    return okResult(result);
  },
});
