import { expect, test, afterEach } from "bun:test";
import { InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
import type { StylometryProfile } from "@kleptowriter/kleptowriter-core";
import { loadMetadata, saveMetadata } from "./persistence.js";
import { setMetadata, getMetadata, queryMetadataTool, updateMetadataTool } from "../tools/metadata-tools.js";
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
  return mkdtemp(join(tmpdir(), "metadata-test-")).then((d) => { CLEANUP_DIRS.push(d); return d; });
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

  await saveMetadata(original, path);
  const loaded = await loadMetadata(path);

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
  const bible = await loadMetadata("/tmp/nonexistent-bible-12345.json");
  expect(bible.characters.size).toBe(0);
  expect(bible.version).toBe(0);
});

// ── Empty file ──────────────────────────────────────────────────────────────

test("empty file returns empty bible", async () => {
  const dir = await tmpDir();
  const path = join(dir, "empty.json");
  await writeFile(path, "", "utf-8");

  const bible = await loadMetadata(path);
  expect(bible.characters.size).toBe(0);
  expect(bible.version).toBe(0);
});

// ── Corrupt JSON ────────────────────────────────────────────────────────────

test("corrupt JSON returns empty bible", async () => {
  const dir = await tmpDir();
  const path = join(dir, "corrupt.json");
  await writeFile(path, "{not valid json!!!", "utf-8");

  const bible = await loadMetadata(path);
  expect(bible.characters.size).toBe(0);
  expect(bible.version).toBe(0);
});

// ── query_metadata tool ─────────────────────────────────────────────────────

test("query_metadata returns all characters", async () => {
  const dir = await tmpDir();
  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  setMetadata(bible, join(dir, "story-metadata.json"));

  const result = await queryMetadataTool.execute!("call-1", { type: "characters" }, undefined, undefined, undefined as any);
  const details = result.details as { results: unknown[]; count: number };
  expect(details.count).toBe(1);
  expect(details.results[0]).toBeDefined();
});

test("query_metadata filters by name", async () => {
  const dir = await tmpDir();
  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  setMetadata(bible, join(dir, "story-metadata.json"));

  const result = await queryMetadataTool.execute!("call-2", { type: "characters", filter: "ali" }, undefined, undefined, undefined as any);
  const details = result.details as { count: number };
  expect(details.count).toBe(1);
});

test("query_metadata returns empty for no match", async () => {
  const dir = await tmpDir();
  const bible = new InMemoryStoryBible();
  bible.characters.set("alice", {
    id: "alice", name: "Alice", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  setMetadata(bible, join(dir, "story-metadata.json"));

  const result = await queryMetadataTool.execute!("call-3", { type: "characters", filter: "zzz" }, undefined, undefined, undefined as any);
  const details = result.details as { count: number };
  expect(details.count).toBe(0);
});

// ── update_metadata tool ────────────────────────────────────────────────────

test("update_metadata stores entity and persists version", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");
  const bible = new InMemoryStoryBible();
  setMetadata(bible, path);

  const result = await updateMetadataTool.execute!(
    "call-1",
    { type: "characters", id: "bob", data: { name: "Bob", tags: ["villain"] } },
    undefined, undefined, undefined as any,
  );
  const details = result.details as { ok: boolean; version: number };
  expect(details.ok).toBe(true);
  expect(details.version).toBe(1);
  expect(getMetadata().characters.get("bob")?.name).toBe("Bob");

  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw);
  expect(parsed.characters.length).toBe(1);
  expect(parsed.version).toBe(details.version);
});

// ── update_metadata with stylometry ──────────────────────────────────────────

test("update_metadata with type stylometry populates metadata stylometry", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");
  const bible = new InMemoryStoryBible();
  setMetadata(bible, path);

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

  const result = await updateMetadataTool.execute!(
    "call-1",
    { type: "stylometry", id: "default", data: stylometryData },
    undefined, undefined, undefined as any,
  );
  const details = result.details as { ok: boolean; version: number };
  expect(details.ok).toBe(true);
  expect(details.version).toBe(1);

  const updatedMetadata = getMetadata();
  expect(updatedMetadata.stylometry).toBeDefined();
  expect(updatedMetadata.stylometry?.narrativeVoice).toBe("first-person");
  expect(updatedMetadata.stylometry?.povStyle).toBe("single");
  expect(updatedMetadata.stylometry?.tensePreference).toBe("past");
  expect(updatedMetadata.stylometry?.vocabularyRegister).toBe("literary");
  expect(updatedMetadata.stylometry?.sentenceLengthTarget).toBe("varied");
  expect(updatedMetadata.stylometry?.proseStyleNotes).toBe("elegant");
  expect(updatedMetadata.stylometry?.dialogueStyleNotes).toBe("naturalistic");
  expect(updatedMetadata.stylometry?.pacingPreference).toBe("measured");
  expect(updatedMetadata.stylometry?.paragraphStructure).toBe("mixed");
  expect(updatedMetadata.stylometry?.rhetoricalDevices).toBe("metaphor");
  expect(updatedMetadata.stylometry?.commaStyle).toBe("oxford");
  expect(updatedMetadata.stylometry?.dialogueTagPreference).toBe("said-only");

  // Verify persistence
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw);
  expect(parsed.stylometry).toBeDefined();
  expect(parsed.stylometry.narrativeVoice).toBe("first-person");
  expect(parsed.version).toBe(details.version);
});

// ── Stylometry roundtrip ──────────────────────────────────────────────────────

test("roundtrip save/load preserves stylometry with all 12 fields", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");

  const original = new InMemoryStoryBible();
  const stylometry: StylometryProfile = {
    narrativeVoice: "first-person intimate",
    povStyle: "limited",
    tensePreference: "past",
    vocabularyRegister: "literary",
    sentenceLengthTarget: "medium-long",
    proseStyleNotes: "lyrical, atmospheric",
    dialogueStyleNotes: "sparse, subtext-heavy",
    pacingPreference: "slow burn",
    paragraphStructure: "varied, rhythmic",
    rhetoricalDevices: "metaphor, repetition",
    commaStyle: "oxford, breath-paced",
    dialogueTagPreference: "said, beats",
  };
  original.stylometry = stylometry;

  original.applyStateUpdate({});
  const origVersion = original.version;

  await saveMetadata(original, path);
  const loaded = await loadMetadata(path);

  expect(loaded.version).toBe(origVersion + 1);
  expect(loaded.stylometry).toBeDefined();
  expect(loaded.stylometry?.narrativeVoice).toBe("first-person intimate");
  expect(loaded.stylometry?.povStyle).toBe("limited");
  expect(loaded.stylometry?.tensePreference).toBe("past");
  expect(loaded.stylometry?.vocabularyRegister).toBe("literary");
  expect(loaded.stylometry?.sentenceLengthTarget).toBe("medium-long");
  expect(loaded.stylometry?.proseStyleNotes).toBe("lyrical, atmospheric");
  expect(loaded.stylometry?.dialogueStyleNotes).toBe("sparse, subtext-heavy");
  expect(loaded.stylometry?.pacingPreference).toBe("slow burn");
  expect(loaded.stylometry?.paragraphStructure).toBe("varied, rhythmic");
  expect(loaded.stylometry?.rhetoricalDevices).toBe("metaphor, repetition");
  expect(loaded.stylometry?.commaStyle).toBe("oxford, breath-paced");
  expect(loaded.stylometry?.dialogueTagPreference).toBe("said, beats");
});

test("roundtrip save/load preserves partial stylometry (some fields undefined)", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");

  const original = new InMemoryStoryBible();
  const stylometry: StylometryProfile = {
    narrativeVoice: "third-person omniscient",
    tensePreference: "present",
    // other fields intentionally undefined
  };
  original.stylometry = stylometry;

  original.applyStateUpdate({});
  const origVersion = original.version;

  await saveMetadata(original, path);
  const loaded = await loadMetadata(path);

  expect(loaded.version).toBe(origVersion + 1);
  expect(loaded.stylometry).toBeDefined();
  expect(loaded.stylometry?.narrativeVoice).toBe("third-person omniscient");
  expect(loaded.stylometry?.tensePreference).toBe("present");
  expect(loaded.stylometry?.povStyle).toBeUndefined();
  expect(loaded.stylometry?.vocabularyRegister).toBeUndefined();
});

test("load bible without stylometry field deserializes without error", async () => {
  const dir = await tmpDir();
  const path = join(dir, "story-metadata.json");

  // Write JSON without stylometry field (simulating old file)
  const oldFormat = {
    version: 1,
    schemaVersion: 0,
    characters: [],
    locations: [],
    items: [],
    arcs: [],
    plotThreads: [],
    dramaticQuestions: [],
    chronology: [],
    knowledgeState: { factsByCharacter: [] },
    thematicProgression: { themes: [] },
  };
  await writeFile(path, JSON.stringify(oldFormat), "utf-8");

  const loaded = await loadMetadata(path);

  expect(loaded.version).toBe(1);
  expect(loaded.stylometry).toBeUndefined();
  expect(loaded.characters.size).toBe(0);
});
