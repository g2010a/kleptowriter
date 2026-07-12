/**
 * Metadata persistence — load/save InMemoryStoryBible as plain JSON.
 *
 * Serialization converts Maps → arrays, Sets → arrays, and extracts
 * closure-based KnowledgeGraph/ThematicProgression data via public APIs.
 * Deserialization reconstructs an InMemoryStoryBible instance.
 *
 * ponytail: version is private (#version) on InMemoryStoryBible.
 * We preserve it by calling applyStateUpdate() N times on load.
 * Ceiling: O(version) — versions are small integers, this is fine.
 */

import { InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
import type {
  ArcTracker,
  CharacterState,
  DramaticQuestion,
  ItemState,
  LocationState,
  PlotThread,
  StylometryProfile,
  StoryBible,
  TimelineEntry,
} from "@kleptowriter/kleptowriter-core";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ── Serializable format ─────────────────────────────────────────────────────
// Plain JSON representation of InMemoryStoryBible state.

interface SerializableCharacterState extends Omit<CharacterState, "relationships" | "knowledge"> {
  relationships: [string, string][];
  knowledge: string[];
}

interface SerializableTimelineEntry {
  sceneId: string;
  timestamp: string; // ISO string or "unknown"
  duration?: string;
  timeOfDay?: string;
}

interface SerializableBible {
  version: number;
  characters: [string, SerializableCharacterState][];
  locations: [string, LocationState][];
  items: [string, ItemState][];
  arcs: [string, ArcTracker][];
  plotThreads: [string, PlotThread][];
  dramaticQuestions: [string, DramaticQuestion][];
  chronology: SerializableTimelineEntry[];
  knowledgeState: { factsByCharacter: [string, [string, string][]][] };
  thematicProgression: {
    themes: [string, { intensity: number; sceneIntensities: [string, number][] }][];
  };
  stylometry?: StylometryProfile;
}

// ── Serialize ───────────────────────────────────────────────────────────────

function serializeBible(bible: InMemoryStoryBible): SerializableBible {
  const characters: [string, SerializableCharacterState][] = [...bible.characters.entries()].map(
    ([id, state]) => [
      id,
      {
        ...state,
        relationships: [...state.relationships.entries()],
        knowledge: [...state.knowledge],
      },
    ],
  );

  const factsByCharacter = [...bible.knowledgeState.allFacts().entries()].map(
    ([charId, facts]) => [charId, [...facts].map((f) => [f, ""] as [string, string])] as [string, [string, string][]],
  );

  const themes: [string, { intensity: number; sceneIntensities: [string, number][] }][] = [
    ...bible.thematicProgression.themes.entries(),
  ].map(([name, ti]) => [
    name,
    {
      intensity: ti.intensity,
      sceneIntensities: [...ti.sceneIntensities.entries()],
    },
  ]);

  return {
    version: bible.version,
    characters,
    locations: [...bible.locations.entries()],
    items: [...bible.items.entries()],
    arcs: [...bible.arcs.entries()],
    plotThreads: [...bible.plotThreads.entries()],
    dramaticQuestions: [...bible.dramaticQuestions.entries()],
    chronology: bible.chronology.map((e) => ({
      sceneId: e.sceneId,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
      duration: e.duration,
      timeOfDay: e.timeOfDay,
    })),
    knowledgeState: { factsByCharacter },
    thematicProgression: { themes },
    stylometry: bible.stylometry,
  };
}

// ── Deserialize ─────────────────────────────────────────────────────────────

function deserializeBible(data: SerializableBible): InMemoryStoryBible {
  const bible = new InMemoryStoryBible();

  // Populate characters
  for (const [id, state] of data.characters) {
    bible.characters.set(id, {
      ...state,
      relationships: new Map(state.relationships),
      knowledge: new Set(state.knowledge),
    });
  }

  // Populate locations
  for (const [id, state] of data.locations) {
    bible.locations.set(id, state);
  }

  // Populate items
  for (const [id, state] of data.items) {
    bible.items.set(id, state);
  }

  // Populate arcs
  for (const [id, state] of data.arcs) {
    bible.arcs.set(id, state);
  }

  // Populate plotThreads
  for (const [id, state] of data.plotThreads) {
    bible.plotThreads.set(id, state);
  }

  // Populate dramaticQuestions
  for (const [id, state] of data.dramaticQuestions) {
    bible.dramaticQuestions.set(id, state);
  }

  // Populate chronology (rehydrate Date strings)
  bible.chronology = data.chronology.map((e) => ({
    ...e,
    timestamp: typeof e.timestamp === "string" && e.timestamp !== "unknown"
      ? new Date(e.timestamp)
      : e.timestamp,
  }));

  // Populate knowledge graph via learn()
  for (const [charId, facts] of data.knowledgeState.factsByCharacter) {
    for (const [fact, sceneId] of facts) {
      bible.knowledgeState.learn(charId, fact, sceneId);
    }
  }

  // Populate thematic progression
  for (const [theme, ti] of data.thematicProgression.themes) {
    bible.thematicProgression.themes.set(theme, {
      intensity: ti.intensity,
      sceneIntensities: new Map(ti.sceneIntensities),
    });
  }

  // Restore version via applyStateUpdate() calls
  // ponytail: O(version) to restore private #version field
  const targetVersion = data.version;
  for (let i = 0; i < targetVersion; i++) {
    bible.applyStateUpdate({});
  }

  if (data.stylometry) {
    bible.stylometry = data.stylometry;
  }

  return bible;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Load story metadata from a JSON file. Returns an empty bible for missing,
 * empty, or corrupt files (with a warning logged to console).
 */
export async function loadMetadata(path: string): Promise<InMemoryStoryBible> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    console.warn(`[metadata] file not found or unreadable: ${path} — returning empty bible`);
    return new InMemoryStoryBible();
  }

  if (!raw.trim()) {
    console.warn(`[metadata] empty file: ${path} — returning empty bible`);
    return new InMemoryStoryBible();
  }

  let data: SerializableBible;
  try {
    data = JSON.parse(raw) as SerializableBible;
  } catch {
    console.warn(`[metadata] corrupt JSON in ${path} — returning empty bible`);
    return new InMemoryStoryBible();
  }

  try {
    return deserializeBible(data);
  } catch (err) {
    console.warn(`[metadata] failed to deserialize ${path}: ${err} — returning empty bible`);
    return new InMemoryStoryBible();
  }
}

// ── Serialization lock ──────────────────────────────────────────────────────
// ponytail: Promise chain serializes concurrent saves to prevent
// .tmp→rename race. Add per-file locks if multiple files are saved.

let saveQueue: Promise<void> = Promise.resolve();

/**
 * Save story metadata to a JSON file atomically (write to .tmp, then rename).
 * Concurrent calls are serialized via a Promise chain to prevent races.
 * Increments the version metadata before writing.
 */
export async function saveMetadata(bible: InMemoryStoryBible, path: string): Promise<void> {
  const task = async () => {
    bible.applyStateUpdate({});

    const serializable = serializeBible(bible);
    const json = JSON.stringify(serializable, null, 2);

    const dir = dirname(path);
    await mkdir(dir, { recursive: true });

    const tmpPath = `${path}.tmp`;
    await writeFile(tmpPath, json, "utf-8");
    await rename(tmpPath, path);
  };

  saveQueue = saveQueue.then(task, task);
  return saveQueue;
}
