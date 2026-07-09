import { expect, test, afterEach } from "bun:test";
import { InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
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
