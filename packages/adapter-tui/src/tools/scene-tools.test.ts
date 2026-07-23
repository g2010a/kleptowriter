import { expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeSceneTool, readSceneTool, listScenesTool, getSceneStore } from "./scene-tools.js";
import { SceneStatus } from "@kleptowriter/kleptowriter-core";
import type { WriteSceneParams, ReadSceneParams, ListScenesParams } from "./types.js";

const TMP = join(import.meta.dir, "../tmp-scene-tools");
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

function makeParams(id: string, title: string, prose: string): WriteSceneParams {
  return {
    sceneId: id,
    title,
    prose,
    metadata: {
      pov: "narrator",
      characters: [],
      locations: [],
      chronology: "",
      tension: 0,
      mood: "",
      plotThreads: [],
      thematicMotifs: [],
    },
  };
}

const DEFAULT_STYLOMETRY = {
  narrativeVoice: "omniscient",
  povStyle: "third-person",
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

function writeBible(stylometry?: Record<string, string>) {
  const bibleDir = join(TMP, "story");
  mkdirSync(bibleDir, { recursive: true });
  const bible = {
    version: 1,
    characters: [],
    locations: [],
    items: [],
    arcs: [],
    plotThreads: [],
    dramaticQuestions: [],
    chronology: [],
    knowledgeState: { factsByCharacter: [] },
    thematicProgression: { themes: [] },
    stylometry,
  };
  writeFileSync(join(bibleDir, "story-metadata.json"), JSON.stringify(bible, null, 2));
}

// ── Roundtrip ───────────────────────────────────────────────────────────────

test("write_scene then read_scene roundtrips all fields", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    const params: WriteSceneParams = {
      sceneId: "setup-01-opening",
      title: "The Opening",
      prose: "It was a dark and stormy night.",
      metadata: {
        pov: "narrator",
        characters: ["alice", "bob"],
        locations: ["castle"],
        chronology: "evening",
        tension: 3,
        mood: "foreboding",
        plotThreads: ["mystery"],
        thematicMotifs: ["darkness"],
      },
    };

    const w = await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);
    expect((w.details as any).ok).toBe(true);
    expect((w.details as any).path).toBe("story/scenes/setup-01-opening.md");

    const r = await readSceneTool.execute("c2", { sceneId: "setup-01-opening" } as ReadSceneParams, undefined, undefined, {} as any);
    const d = r.details as any;
    expect(d.ok).toBe(true);
    expect(d.scene.title).toBe("The Opening");
    expect(d.scene.prose).toBe("It was a dark and stormy night.");
    expect(d.scene.status).toBe(SceneStatus.Outline);
    expect(d.scene.metadata.pov).toBe("narrator");
    expect(d.scene.metadata.characters).toEqual(["alice", "bob"]);
    expect(d.scene.metadata.locations).toEqual(["castle"]);
    expect(d.scene.metadata.chronology).toBe("evening");
    expect(d.scene.metadata.tension).toBe(3);
    expect(d.scene.metadata.mood).toBe("foreboding");
    expect(d.scene.metadata.plotThreads).toEqual(["mystery"]);
    expect(d.scene.metadata.thematicMotifs).toEqual(["darkness"]);
  } finally {
    teardown();
  }
});

// ── Update preserves status ─────────────────────────────────────────────────

test("write_scene preserves status on overwrite", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    const base = makeParams("rising-action-02-discovery", "Discovery", "She found the key.");
    await writeSceneTool.execute("c1", base, undefined, undefined, {} as any);

    const r1 = await readSceneTool.execute("c2", { sceneId: base.sceneId } as ReadSceneParams, undefined, undefined, {} as any);
    expect((r1.details as any).scene.status).toBe(SceneStatus.Outline);

    await writeSceneTool.execute("c3", { ...base, prose: "Updated prose." }, undefined, undefined, {} as any);
    const r2 = await readSceneTool.execute("c4", { sceneId: base.sceneId } as ReadSceneParams, undefined, undefined, {} as any);
    expect((r2.details as any).scene.status).toBe(SceneStatus.Outline);
    expect((r2.details as any).scene.prose).toBe("Updated prose.");
  } finally {
    teardown();
  }
});

// ── List sorted by ID ───────────────────────────────────────────────────────

test("list_scenes returns scenes sorted by ID", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    await writeSceneTool.execute("a", makeParams("resolution-06-end", "The End", "Prose for The End."), undefined, undefined, {} as any);
    await writeSceneTool.execute("b", makeParams("setup-01-start", "The Start", "Prose for The Start."), undefined, undefined, {} as any);
    await writeSceneTool.execute("c", makeParams("climax-04-battle", "The Battle", "Prose for The Battle."), undefined, undefined, {} as any);

    const result = await listScenesTool.execute("d", {} as ListScenesParams, undefined, undefined, {} as any);
    const scenes = (result.details as any).scenes;

    expect(scenes).toHaveLength(3);
    expect(scenes[0].id).toBe("climax-04-battle");
    expect(scenes[1].id).toBe("resolution-06-end");
    expect(scenes[2].id).toBe("setup-01-start");

    for (const s of scenes) {
      expect(typeof s.wordCount).toBe("number");
      expect(s.wordCount).toBeGreaterThan(0);
      expect(typeof s.status).toBe("string");
    }
  } finally {
    teardown();
  }
});

// ── Invalid scene IDs ──────────────────────────────────────────────────────

test("write_scene rejects invalid scene IDs", async () => {
  setup();
  try {
    const bad = ["no-sequence", "setup-1-tooshort", "Setup-01-Caps", "setup-01-", "-01-slug", "setup_01_underscores"];
    for (const id of bad) {
      const r = await writeSceneTool.execute("x", makeParams(id, "Bad", "x"), undefined, undefined, {} as any);
      expect((r.details as any).ok).toBe(false);
      expect((r.details as any).error).toContain("Invalid scene ID");
    }
  } finally {
    teardown();
  }
});

test("read_scene rejects invalid scene IDs", async () => {
  setup();
  try {
    const r = await readSceneTool.execute("x", { sceneId: "bad-id" } as ReadSceneParams, undefined, undefined, {} as any);
    expect((r.details as any).ok).toBe(false);
    expect((r.details as any).error).toContain("Invalid scene ID");
  } finally {
    teardown();
  }
});

// ── .md suffix handling ──────────────────────────────────────────────────────

test("write_scene accepts scene ID with .md suffix", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    const params = makeParams("setup-01-opening.md", "Opening", "It was a dark night.");
    const result = await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);
    const details = result.details as any;
    expect(details.ok).toBe(true);
    expect(details.path).toBe("story/scenes/setup-01-opening.md");
  } finally {
    teardown();
  }
});

test("read_scene accepts scene ID with .md suffix", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    const params = makeParams("setup-01-opening", "Opening", "It was a dark night.");
    await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);

    const result = await readSceneTool.execute("c2", { sceneId: "setup-01-opening.md" } as ReadSceneParams, undefined, undefined, {} as any);
    const details = result.details as any;
    expect(details.ok).toBe(true);
    expect(details.scene.title).toBe("Opening");
    expect(details.scene.prose).toBe("It was a dark night.");
  } finally {
    teardown();
  }
});

// ── Edge cases ──────────────────────────────────────────────────────────────

test("list_scenes returns empty when no scenes exist", async () => {
  setup();
  try {
    const r = await listScenesTool.execute("x", {} as ListScenesParams, undefined, undefined, {} as any);
    expect((r.details as any).scenes).toEqual([]);
  } finally {
    teardown();
  }
});

test("read_scene returns error for non-existent scene", async () => {
  setup();
  try {
    const r = await readSceneTool.execute("x", { sceneId: "setup-01-nosuch" } as ReadSceneParams, undefined, undefined, {} as any);
    expect((r.details as any).ok).toBe(false);
    expect(typeof (r.details as any).error).toBe("string");
  } finally {
    teardown();
  }
});

// ── Datastore sync ──────────────────────────────────────────────────────────

test("write_scene updates SceneDatastore with written document", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    const store = getSceneStore();
    const params = makeParams("setup-01-prologue", "Prologue", "Once upon a time.");
    await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);

    const stored = store.get("setup-01-prologue");
    expect(stored).toBeDefined();
    expect(stored!.id).toBe("setup-01-prologue");
    expect(stored!.title).toBe("Prologue");
    expect(stored!.prose).toBe("Once upon a time.");
    expect(stored!.status).toBe(SceneStatus.Outline);
  } finally {
    teardown();
  }
});

// ── Stylometry check ──────────────────────────────────────────────────────────

test("write_scene returns error when bible has no stylometry", async () => {
  setup();
  try {
    writeBible(); // empty bible, no stylometry
    const params = makeParams("setup-01-opening", "Opening", "It was a dark night.");
    const result = await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);
    const details = result.details as any;
    expect(details.ok).toBe(false);
    expect(details.error).toContain("Stylometry profile is empty");
    expect(details.error).toContain("narrativeVoice");
    expect(details.error).toContain("dialogueTagPreference");
  } finally {
    teardown();
  }
});

test("write_scene returns error when bible has empty stylometry fields", async () => {
  setup();
  try {
    writeBible({ narrativeVoice: "", povStyle: "" }); // all fields empty
    const params = makeParams("setup-01-opening", "Opening", "It was a dark night.");
    const result = await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);
    const details = result.details as any;
    expect(details.ok).toBe(false);
    expect(details.error).toContain("Stylometry profile is empty");
  } finally {
    teardown();
  }
});

test("write_scene proceeds normally when stylometry is populated", async () => {
  setup();
  try {
    writeBible(DEFAULT_STYLOMETRY);
    const params = makeParams("setup-01-opening", "Opening", "It was a dark night.");
    const result = await writeSceneTool.execute("c1", params, undefined, undefined, {} as any);
    const details = result.details as any;
    expect(details.ok).toBe(true);
    expect(details.path).toBe("story/scenes/setup-01-opening.md");
  } finally {
    teardown();
  }
});
