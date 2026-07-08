import { expect, test, afterEach } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { suggestNextBeatTool } from "./markov-tools.js";
import type { SuggestNextBeatParams } from "./types.js";

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
  const d = join(originalCwd, "packages/adapter-pi/tmp-markov-" + Date.now());
  mkdirSync(d, { recursive: true });
  CLEANUP_DIRS.push(d);
  return d;
}

function writeScene(dir: string, sceneId: string, prose: string) {
  const scenesDir = join(dir, "story", "scenes");
  mkdirSync(scenesDir, { recursive: true });
  const frontmatter = [
    "---",
    `id: ${sceneId}`,
    `title: ${sceneId}`,
    "status: 2",
    "metadata:",
    "  pov: narrator",
    "  characters: []",
    "  locations: []",
    "  chronology: ''",
    "  tension: 3",
    "  mood: neutral",
    "  plotThreads: []",
    "  thematicMotifs: []",
    "  dramaticQuestions: []",
    "---",
  ].join("\n");
  writeFileSync(join(scenesDir, `${sceneId}.md`), frontmatter + "\n" + prose, "utf-8");
}

async function callTool(params: SuggestNextBeatParams = {}) {
  return suggestNextBeatTool.execute!(
    "call-1",
    params,
    undefined,
    undefined,
    {} as any,
  );
}

// ── Non-empty scenes → suggestions with non-zero probabilities ─────────────

test("suggest_next_beat returns non-zero probabilities with existing scenes", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  writeScene(dir, "setup-01-introduction", "Alice arrived in the city.");
  writeScene(dir, "setup-02-exploration", "She explored the old quarter.");

  const result = await callTool();
  const details = result.details as any;

  expect(details.template).toBe("Three-Act Structure");
  expect(typeof details.currentBeat).toBe("string");
  expect(details.currentBeat.length).toBeGreaterThan(0);
  expect(Array.isArray(details.suggestions)).toBe(true);
  expect(details.suggestions.length).toBeGreaterThan(0);

  for (const s of details.suggestions) {
    expect(typeof s.beat).toBe("string");
    expect(typeof s.probability).toBe("number");
    expect(s.probability).toBeGreaterThan(0);
    expect(typeof s.description).toBe("string");
  }
});

// ── Different beats → current beat reflects last scene ─────────────────────

test("suggest_next_beat detects current beat from scene IDs", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  writeScene(dir, "climax-01-battle", "The battle began.");
  writeScene(dir, "resolution-02-aftermath", "After the dust settled.");

  const result = await callTool();
  const details = result.details as any;

  expect(details.currentBeat).toBe("resolution");
  expect(details.suggestions.length).toBeGreaterThan(0);
});

test("current beat uses template order, not filename order", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  writeScene(dir, "setup-02-exploration", "She explored.");
  writeScene(dir, "inciting-incident-01-disruption", "Everything changed.");

  const result = await callTool();
  const details = result.details as any;

  expect(details.currentBeat).toBe("inciting-incident");
});

test("same-beat scenes resolve by sequence number", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  writeScene(dir, "setup-01-intro", "Once upon a time.");
  writeScene(dir, "setup-03-deepening", "Things got complicated.");

  const result = await callTool();
  const details = result.details as any;

  expect(details.currentBeat).toBe("setup");
});

// ── Empty workspace → first beat from template ─────────────────────────────

test("suggest_next_beat returns first beat for empty workspace", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  const result = await callTool();
  const details = result.details as any;

  expect(details.template).toBe("Three-Act Structure");
  expect(details.currentBeat).toBe("");
  expect(details.suggestions).toHaveLength(1);
  expect(details.suggestions[0].beat).toBe("setup");
  expect(details.suggestions[0].probability).toBe(1);
  expect(typeof details.suggestions[0].description).toBe("string");
  expect(details.suggestions[0].description.length).toBeGreaterThan(0);
});

// ── Custom template ────────────────────────────────────────────────────────

test("suggest_next_beat accepts a custom template name", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  const result = await callTool({ template: "Hero's Journey" });
  const details = result.details as any;

  expect(details.template).toBe("Hero's Journey");
  expect(details.suggestions.length).toBeGreaterThan(0);
  expect(details.suggestions[0].probability).toBe(1);
});

// ── Unknown template → empty suggestions ───────────────────────────────────

test("suggest_next_beat returns empty suggestions for unknown template", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  const result = await callTool({ template: "Nonexistent Template" });
  const details = result.details as any;

  expect(details.suggestions).toEqual([]);
  expect(details.currentBeat).toBe("");
});

// ── Missing scenes directory → treated as empty ────────────────────────────

test("suggest_next_beat handles missing scenes directory gracefully", async () => {
  const dir = await tmpDir();
  process.chdir(dir);

  const result = await callTool();
  const details = result.details as any;

  expect(details.suggestions).toHaveLength(1);
  expect(details.suggestions[0].beat).toBe("setup");
});
