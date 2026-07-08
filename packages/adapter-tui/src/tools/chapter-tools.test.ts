import { expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deduceChaptersTool } from "./chapter-tools.js";

const TMP = join(import.meta.dir, "../tmp-chapter-tools");
const originalCwd = process.cwd();

function setup() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  process.chdir(TMP);
}

function teardown() {
  process.chdir(originalCwd);
  rmSync(TMP, { recursive: true, force: true });
}

function writeSceneFile(sceneId: string, metadata: Record<string, unknown>, prose: string) {
  const dir = join(TMP, "story", "scenes");
  mkdirSync(dir, { recursive: true });

  const chars = Array.isArray(metadata.characters) ? (metadata.characters as string[]) : [];
  const locs = Array.isArray(metadata.locations) ? (metadata.locations as string[]) : [];
  const threads = Array.isArray(metadata.plotThreads) ? (metadata.plotThreads as string[]) : [];
  const motifs = Array.isArray(metadata.thematicMotifs) ? (metadata.thematicMotifs as string[]) : [];

  const yamlLines: string[] = [];
  yamlLines.push(`id: ${sceneId}`);
  yamlLines.push(`title: "${metadata.title ?? sceneId}"`);
  yamlLines.push(`status: ${metadata.status ?? 2}`);
  if (metadata.pov) yamlLines.push(`metadata:`);
  if (metadata.pov) yamlLines.push(`  pov: ${metadata.pov}`);
  if (chars.length > 0) yamlLines.push(`  characters:`);
  for (const c of chars) yamlLines.push(`    - ${c}`);
  if (locs.length > 0) yamlLines.push(`  locations:`);
  for (const l of locs) yamlLines.push(`    - ${l}`);
  if (metadata.chronology) yamlLines.push(`  chronology: ${metadata.chronology}`);
  if (metadata.tension !== undefined) yamlLines.push(`  tension: ${metadata.tension}`);
  if (metadata.mood) yamlLines.push(`  mood: ${metadata.mood}`);
  if (threads.length > 0) yamlLines.push(`  plotThreads:`);
  for (const t of threads) yamlLines.push(`    - ${t}`);
  if (motifs.length > 0) yamlLines.push(`  thematicMotifs:`);
  for (const m of motifs) yamlLines.push(`    - ${m}`);

  const content = `---\n${yamlLines.join("\n")}\n---\n\n${prose}`;
  writeFileSync(join(dir, `${sceneId}.md`), content, "utf-8");
}

// ── One scene → single chapter ────────────────────────────────────────────

test("deduce_chapters with one scene returns single chapter", async () => {
  setup();
  try {
    writeSceneFile("setup-01-opening", {
      title: "The Opening",
      pov: "ada",
      characters: ["ada"],
      locations: ["london"],
      chronology: "1843-01-15T10:00:00Z",
      tension: 3,
      mood: "curious",
      plotThreads: ["mystery"],
      thematicMotifs: ["discovery"],
    }, "It was the best of times.");

    const r = await deduceChaptersTool.execute("c1", {} as any, undefined, undefined, {} as any);
    const d = r.details as any;

    expect(d.chapters).toHaveLength(1);
    expect(d.chapters[0].chapterNumber).toBe(1);
    expect(d.chapters[0].scenes).toEqual(["setup-01-opening"]);
    expect(typeof d.chapters[0].summary).toBe("string");
  } finally {
    teardown();
  }
});

// ── Multiple scenes with POV changes → chapter groupings ──────────────────

test("deduce_chapters groups scenes into chapters by POV changes", async () => {
  setup();
  try {
    writeSceneFile("setup-01-intro", {
      title: "Intro",
      pov: "ada",
      characters: ["ada"],
      locations: ["london"],
      tension: 2,
      plotThreads: ["mystery"],
      thematicMotifs: ["discovery"],
    }, "Ada arrived in London.");

    writeSceneFile("setup-02-exploration", {
      title: "Exploration",
      pov: "ada",
      characters: ["ada"],
      locations: ["london"],
      tension: 4,
      plotThreads: ["mystery"],
      thematicMotifs: ["discovery"],
    }, "She explored the city.");

    writeSceneFile("setup-03-research", {
      title: "Research",
      pov: "ada",
      characters: ["ada"],
      locations: ["london"],
      tension: 5,
      plotThreads: ["mystery"],
      thematicMotifs: ["discovery"],
    }, "She studied the manuscripts.");

    writeSceneFile("rising-action-04-byron-enters", {
      title: "Byron Enters",
      pov: "byron",
      characters: ["byron", "ada"],
      locations: ["manor"],
      tension: 6,
      plotThreads: ["mystery", "romance"],
      thematicMotifs: ["ambition"],
    }, "Byron appeared at the manor.");

    writeSceneFile("rising-action-05-conflict", {
      title: "Conflict",
      pov: "byron",
      characters: ["byron"],
      locations: ["manor"],
      tension: 7,
      plotThreads: ["romance"],
      thematicMotifs: ["ambition", "tension"],
    }, "Tensions rose between them.");

    const r = await deduceChaptersTool.execute("c1", {} as any, undefined, undefined, {} as any);
    const d = r.details as any;

    expect(d.chapters.length).toBeGreaterThanOrEqual(2);
    expect(d.chapters[0].chapterNumber).toBe(1);
    expect(d.chapters[1].chapterNumber).toBe(2);

    const allScenes = d.chapters.flatMap((c: any) => c.scenes);
    expect(allScenes).toHaveLength(5);
  } finally {
    teardown();
  }
});

// ── Rerun determinism ──────────────────────────────────────────────────────

test("deduce_chapters is deterministic on rerun", async () => {
  setup();
  try {
    writeSceneFile("setup-01-start", {
      title: "Start",
      pov: "ada",
      characters: ["ada"],
      locations: ["london"],
      tension: 3,
      plotThreads: ["mystery"],
      thematicMotifs: ["discovery"],
    }, "Beginning.");

    writeSceneFile("climax-02-end", {
      title: "End",
      pov: "byron",
      characters: ["byron"],
      locations: ["manor"],
      tension: 9,
      plotThreads: ["mystery"],
      thematicMotifs: ["resolution"],
    }, "The end.");

    const r1 = await deduceChaptersTool.execute("c1", {} as any, undefined, undefined, {} as any);
    const r2 = await deduceChaptersTool.execute("c2", {} as any, undefined, undefined, {} as any);

    expect(JSON.stringify(r1.details)).toBe(JSON.stringify(r2.details));
  } finally {
    teardown();
  }
});

// ── chapters.yaml is written ───────────────────────────────────────────────

test("deduce_chapters writes story/chapters.yaml", async () => {
  setup();
  try {
    writeSceneFile("setup-01-prologue", {
      title: "Prologue",
      pov: "narrator",
      tension: 1,
    }, "Once upon a time.");

    await deduceChaptersTool.execute("c1", {} as any, undefined, undefined, {} as any);

    const yaml = readFileSync(join(TMP, "story", "chapters.yaml"), "utf-8");
    expect(yaml).toContain("chapters:");
    expect(yaml).toContain("chapterNumber: 1");
    expect(yaml).toContain("setup-01-prologue");
  } finally {
    teardown();
  }
});

// ── Empty scenes → empty chapters ──────────────────────────────────────────

test("deduce_chapters returns empty when no scenes exist", async () => {
  setup();
  try {
    const r = await deduceChaptersTool.execute("c1", {} as any, undefined, undefined, {} as any);
    const d = r.details as any;
    expect(d.chapters).toEqual([]);
  } finally {
    teardown();
  }
});
