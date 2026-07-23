import { expect, test, afterEach } from "bun:test";
import { InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
import { loadBible, saveBible } from "./persistence.js";
import { setBible, getBible, queryBibleTool, updateBibleTool } from "../tools/bible-tools.js";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLEANUP_DIRS: string[] = [];

afterEach(async () => {
  for (const dir of CLEANUP_DIRS) {
    try { await rm(dir, { recursive: true }); } catch { /* ignore */ }
  }
  CLEANUP_DIRS.length = 0;
});

function tmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bible-test-")).then((d) => { CLEANUP_DIRS.push(d); return d; });
}

// ── Roundtrip save/load ─────────────────────────────────────────────────────

test("roundtrip save/load preserves all bible state", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");

  const original = new InMemoryStoryBible();
  original.characters.set("alice", {
    id: "alice", name: "Alice", aliases: ["A"], tags: ["protagonist"],
    traits: { age: "30" }, relationships: new Map([["bob", "friend"]]),
    knowledge: new Set(["secret1"]), arcBeatIds: ["beat-1"],
  });
  original.locations.set("castle", {
    id: "castle", name: "Castle", aliases: ["fortress"], tags: ["setting"],
    description: "A dark castle", relatedLocations: [],
  });
  original.plotThreads.set("main", {
    id: "main", name: "Main Plot", description: "The main story",
    status: "introduced", relatedSceneIds: ["scene-1"],
  });
  original.chronology.push({ sceneId: "scene-1", timestamp: new Date("2024-01-01") });
  original.knowledgeState.learn("alice", "knows magic", "scene-1");
  original.thematicProgression.recordIntensity("redemption", "scene-1", 0.8);

  original.applyStateUpdate({});
  original.applyStateUpdate({});
  const origVersion = original.version;

  await saveBible(original, path);
  const loaded = await loadBible(path);

  expect(loaded.version).toBe(origVersion + 1);
  expect(loaded.characters.size).toBe(1);
  expect(loaded.characters.get("alice")?.name).toBe("Alice");
  expect(loaded.characters.get("alice")?.relationships.get("bob")).toBe("friend");
  expect(loaded.characters.get("alice")?.knowledge.has("secret1")).toBe(true);
  expect(loaded.locations.size).toBe(1);
  expect(loaded.locations.get("castle")?.name).toBe("Castle");
  expect(loaded.plotThreads.size).toBe(1);
  expect(loaded.plotThreads.get("main")?.status).toBe("introduced");
  expect(loaded.chronology.length).toBe(1);
  expect(loaded.chronology[0]?.timestamp).toBeInstanceOf(Date);
  expect(loaded.knowledgeState.knows("alice", "knows magic")).toBe(true);
  expect(loaded.thematicProgression.getIntensity("redemption")).toBe(0.8);
});

// ── Missing file ────────────────────────────────────────────────────────────

test("missing file returns empty bible", async () => {
  const bible = await loadBible("/tmp/nonexistent-bible-12345.json");
  expect(bible.characters.size).toBe(0);
  expect(bible.version).toBe(0);
});

// ── Empty file ──────────────────────────────────────────────────────────────

test("empty file returns empty bible", async () => {
  const dir = await tmpDir();
  const path = join(dir, "empty.json");
  await writeFile(path, "", "utf-8");

  const bible = await loadBible(path);
  expect(bible.characters.size).toBe(0);
  expect(bible.version).toBe(0);
});

// ── Corrupt JSON ────────────────────────────────────────────────────────────

test("corrupt JSON returns empty bible", async () => {
  const dir = await tmpDir();
  const path = join(dir, "corrupt.json");
  await writeFile(path, "{not valid json!!!", "utf-8");

  const bible = await loadBible(path);
  expect(bible.characters.size).toBe(0);
  expect(bible.version).toBe(0);
});

// ── query_bible tool ────────────────────────────────────────────────────────

test("query_bible returns all characters", async () => {
  const dir = await tmpDir();
  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  setBible(bible, join(dir, "story-metadata.json"));

  const result = await queryBibleTool.execute!("call-1", { type: "characters" }, undefined, undefined, undefined as any);
  const details = result.details as { results: unknown[]; count: number };
  expect(details.count).toBe(1);
  expect(details.results[0]).toBeDefined();
});

test("query_bible filters by name", async () => {
  const dir = await tmpDir();
  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  setBible(bible, join(dir, "story-metadata.json"));

  const result = await queryBibleTool.execute!("call-2", { type: "characters", filter: "ali" }, undefined, undefined, undefined as any);
  const details = result.details as { count: number };
  expect(details.count).toBe(1);
});

test("query_bible returns empty for no match", async () => {
  const dir = await tmpDir();
  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  setBible(bible, join(dir, "story-metadata.json"));

  const result = await queryBibleTool.execute!("call-3", { type: "characters", filter: "zzz" }, undefined, undefined, undefined as any);
  const details = result.details as { count: number };
  expect(details.count).toBe(0);
});

// ── update_bible tool ───────────────────────────────────────────────────────

test("update_bible stores entity and persists version", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");
  const bible = new InMemoryStoryBible();
  setBible(bible, path);

  const result = await updateBibleTool.execute!(
    "call-1",
    { type: "characters", id: "bob", data: { name: "Bob", tags: ["villain"] } },
    undefined, undefined, undefined as any,
  );
  const details = result.details as { ok: boolean; version: number };
  expect(details.ok).toBe(true);
  expect(details.version).toBe(1);
  expect(getBible().characters.get("bob")?.name).toBe("Bob");

  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw);
  expect(parsed.characters.length).toBe(1);
  expect(parsed.version).toBe(details.version);
});

// ── update_bible with stylometry ────────────────────────────────────────────

test("update_bible with type stylometry populates bible stylometry", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");
  const bible = new InMemoryStoryBible();
  setBible(bible, path);

  const stylometryData = {
    narrativeVoice: "first-person",
    povStyle: "single",
    tensePreference: "past",
    vocabularyRegister: "literary",
    sentenceLengthTarget: "varied",
    proseStyleNotes: "elegant",
    dialogueStyleNotes: "naturalistic",
    pacingPreference: "measured",
    paragraphStructure: "mixed",
    rhetoricalDevices: "metaphor",
    commaStyle: "oxford",
    dialogueTagPreference: "said-only",
  };

  const result = await updateBibleTool.execute!(
    "call-1",
    { type: "stylometry", id: "default", data: stylometryData },
    undefined, undefined, undefined as any,
  );
  const details = result.details as { ok: boolean; version: number };
  expect(details.ok).toBe(true);
  expect(details.version).toBe(1);

  const updatedBible = getBible();
  expect(updatedBible.stylometry).toBeDefined();
  expect(updatedBible.stylometry?.narrativeVoice).toBe("first-person");
  expect(updatedBible.stylometry?.povStyle).toBe("single");
  expect(updatedBible.stylometry?.tensePreference).toBe("past");
  expect(updatedBible.stylometry?.vocabularyRegister).toBe("literary");
  expect(updatedBible.stylometry?.sentenceLengthTarget).toBe("varied");
  expect(updatedBible.stylometry?.proseStyleNotes).toBe("elegant");
  expect(updatedBible.stylometry?.dialogueStyleNotes).toBe("naturalistic");
  expect(updatedBible.stylometry?.pacingPreference).toBe("measured");
  expect(updatedBible.stylometry?.paragraphStructure).toBe("mixed");
  expect(updatedBible.stylometry?.rhetoricalDevices).toBe("metaphor");
  expect(updatedBible.stylometry?.commaStyle).toBe("oxford");
  expect(updatedBible.stylometry?.dialogueTagPreference).toBe("said-only");

  // Verify persistence
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw);
  expect(parsed.stylometry).toBeDefined();
  expect(parsed.stylometry.narrativeVoice).toBe("first-person");
  expect(parsed.version).toBe(details.version);
});
