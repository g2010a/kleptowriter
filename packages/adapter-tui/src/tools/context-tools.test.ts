import { expect, test, afterEach } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadContextTool } from "./context-tools.js";
import type { LoadContextParams } from "./types.js";
import { InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
import { saveMetadata } from "../metadata/persistence.js";

const CLEANUP_DIRS: string[] = [];
const originalCwd = process.cwd();

afterEach(async () => {
  process.chdir(originalCwd);
  for (const dir of CLEANUP_DIRS) {
    try { await rm(dir, { recursive: true }); } catch { /* ignore */ }
  }
  CLEANUP_DIRS.length = 0;
});

async function tmpDir(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "context-test-"));
  CLEANUP_DIRS.push(d);
  return d;
}

function writeScene(dir: string, sceneId: string, title: string, prose: string) {
  const frontmatter = [
    "---",
    `id: ${sceneId}`,
    `title: ${title}`,
    "status: 0",
    "metadata:",
    "  pov: narrator",
    "  characters:",
    "    - alice",
    "  locations:",
    "    - castle",
    "  chronology: ''",
    "  tension: 3",
    "  mood: tense",
    "  plotThreads:",
    "    - mystery",
    "  thematicMotifs:",
    "    - dark",
    "  dramaticQuestions:",
    "    - will-she-survive",
    "---",
  ].join("\n");
  writeFileSync(join(dir, `${sceneId}.md`), frontmatter + "\n" + prose, "utf-8");
}

async function writeMetadata(dir: string, bible: InMemoryStoryBible) {
  mkdirSync(join(dir, "story"), { recursive: true });
  await saveMetadata(bible, join(dir, "story", "story-metadata.json"));
}

// ── Empty workspace ─────────────────────────────────────────────────────────

test("load_context returns empty bible and scenes for missing directories", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  const result = await loadContextTool.execute!("call-1", {} as LoadContextParams, undefined, undefined, {} as any);
  const details = result.details as { bible: Record<string, unknown>; recentScenes: unknown[] };

  expect(details.bible).toBeDefined();
  expect(Array.isArray((details.bible as any).characters)).toBe(true);
  expect((details.bible as any).characters).toHaveLength(0);
  expect((details.bible as any).arcs).toEqual([]);
  expect(details.recentScenes).toEqual([]);
});

// ── Empty scenes dir ────────────────────────────────────────────────────────

test("load_context returns empty scenes when story/scenes/ exists but is empty", async () => {
  const dir = await tmpDir();
  mkdirSync(join(dir, "story", "scenes"), { recursive: true });
  process.chdir(dir);

  const result = await loadContextTool.execute!("call-1", {} as LoadContextParams, undefined, undefined, {} as any);
  const details = result.details as { bible: Record<string, unknown>; recentScenes: unknown[] };

  expect(details.recentScenes).toEqual([]);
});

// ── Bible + scenes ──────────────────────────────────────────────────────────

test("load_context returns bible and recent scenes from workspace", async () => {
  const dir = await tmpDir();
  mkdirSync(join(dir, "story", "scenes"), { recursive: true });
  process.chdir(dir);

  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: ["A"], tags: ["protagonist"],
    traits: { age: "30" }, relationships: new Map([["bob", "friend"]]),
    knowledge: new Set(), arcBeatIds: [],
  });
  bible.arcs.set("hero-journey", {
    id: "hero-journey", name: "Hero Journey", description: "Alice's arc",
    beatIds: ["beat-1", "beat-2"], completedBeatIds: ["beat-1"], progress: 0.5,
  });
  await writeMetadata(dir, bible);

  writeScene(join(dir, "story", "scenes"), "setup-01-start", "The Start", "Alice entered the room.");
  writeScene(join(dir, "story", "scenes"), "rising-02-fight", "The Fight", "Alice fought the dragon.");
  writeScene(join(dir, "story", "scenes"), "resolution-03-end", "The End", "Alice won.");

  const result = await loadContextTool.execute!("call-1", {} as LoadContextParams, undefined, undefined, {} as any);
  const details = result.details as { bible: Record<string, unknown>; recentScenes: any[] };

  // Bible has characters + arcs
  expect((details.bible as any).characters).toHaveLength(1);
  expect((details.bible as any).characters[0].name).toBe("Alice");
  expect((details.bible as any).arcs).toHaveLength(1);
  expect((details.bible as any).arcs[0].name).toBe("Hero Journey");
  expect((details.bible as any).arcs[0].progress).toBe(0.5);

  // 3 scenes present, all returned (default 5 > 3)
  expect(details.recentScenes).toHaveLength(3);

  // Scenes sorted by filename ascending, last N taken
  expect(details.recentScenes[0].id).toBe("resolution-03-end");
  expect(details.recentScenes[1].id).toBe("rising-02-fight");
  expect(details.recentScenes[2].id).toBe("setup-01-start");

  // Full prose + metadata included
  const first = details.recentScenes[0];
  expect(first.prose).toBe("Alice won.");
  expect(first.wordCount).toBeGreaterThan(0);
  expect(first.metadata.pov).toBe("narrator");
  expect(first.metadata.characters).toEqual(["alice"]);
  expect(first.metadata.locations).toEqual(["castle"]);
  expect(first.metadata.tension).toBe(3);
  expect(first.metadata.mood).toBe("tense");
  expect(first.metadata.plotThreads).toEqual(["mystery"]);
  expect(first.metadata.thematicMotifs).toEqual(["dark"]);
  expect(first.metadata.dramaticQuestions).toEqual(["will-she-survive"]);
  expect(first.customFields).toEqual({});
});

// ── sceneCount limit ────────────────────────────────────────────────────────

test("load_context respects sceneCount parameter", async () => {
  const dir = await tmpDir();
  mkdirSync(join(dir, "story", "scenes"), { recursive: true });
  process.chdir(dir);

  writeScene(join(dir, "story", "scenes"), "setup-01-start", "The Start", "One.");
  writeScene(join(dir, "story", "scenes"), "rising-02-fight", "The Fight", "Two.");
  writeScene(join(dir, "story", "scenes"), "rising-03-chase", "The Chase", "Three.");
  writeScene(join(dir, "story", "scenes"), "resolution-04-end", "The End", "Four.");

  const result = await loadContextTool.execute!("call-1", { sceneCount: 2 } as LoadContextParams, undefined, undefined, {} as any);
  const details = result.details as { recentScenes: any[] };

  // Last 2 by filename: rising-03-chase, setup-01-start
  expect(details.recentScenes).toHaveLength(2);
  expect(details.recentScenes[0].id).toBe("rising-03-chase");
  expect(details.recentScenes[1].id).toBe("setup-01-start");
});

// ── Resume scenario ─────────────────────────────────────────────────────────

test("load_context returns previously written bible and scenes (resume)", async () => {
  const dir = await tmpDir();
  mkdirSync(join(dir, "story", "scenes"), { recursive: true });
  process.chdir(dir);

  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  bible.characters.set("bob", {
    id: "bob", name: "Bob", aliases: ["Robert"], tags: ["villain"], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  bible.arcs.set("redemption", {
    id: "redemption", name: "Redemption", description: "Bob's redemption",
    beatIds: ["beat-a"], completedBeatIds: [], progress: 0.2,
  });
  await writeMetadata(dir, bible);

  writeScene(join(dir, "story", "scenes"), "setup-01-intro", "Intro", "Once upon a time.");
  writeScene(join(dir, "story", "scenes"), "rising-02-conflict", "Conflict", "Bob appeared.");

  const result = await loadContextTool.execute!("call-1", {} as LoadContextParams, undefined, undefined, {} as any);
  const details = result.details as { bible: Record<string, unknown>; recentScenes: any[] };

  // Both characters present
  expect((details.bible as any).characters).toHaveLength(2);
  const names = (details.bible as any).characters.map((c: any) => c.name).sort();
  expect(names).toEqual(["Alice", "Bob"]);

  // Arc present
  expect((details.bible as any).arcs).toHaveLength(1);
  expect((details.bible as any).arcs[0].name).toBe("Redemption");

  // Both scenes returned with metadata
  expect(details.recentScenes).toHaveLength(2);
  expect(details.recentScenes[0].title).toBe("Conflict");
  expect(details.recentScenes[0].metadata).toBeDefined();
  expect(details.recentScenes[0].customFields).toBeDefined();
  expect(details.recentScenes[1].title).toBe("Intro");
});
