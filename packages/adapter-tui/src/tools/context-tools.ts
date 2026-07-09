/**
 * Context tool — real implementation of load_context.
 *
 * Loads metadata from ./story/story-metadata.json via loadMetadata() and the last N scenes
 * from ./story/scenes/ (default N=5). Returns metadata + recentScenes for
 * LLM context injection.
 *
 * ponytail: module-level story dir. Add per-session override when needed.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { InMemoryStoryBible, readScene, SceneStatus } from "@kleptowriter/kleptowriter-core";
import { loadMetadata } from "../metadata/persistence.js";
import { setMetadata } from "./metadata-tools.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { LoadContextParamsSchema } from "./types.js";
import type { LoadContextParams, LoadContextResult, LoadContextRecentScene } from "./types.js";

const DEFAULT_STORY_DIR = "./story";
const DEFAULT_BIBLE_PATH = "./story/story-metadata.json";
const DEFAULT_SCENES_DIR = "./story/scenes";
const DEFAULT_SCENE_COUNT = 5;

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ── load_context ────────────────────────────────────────────────────────────

export const loadContextTool = defineTool({
  name: "load_context",
  label: "Load Context",
  description:
    "Loads the current story state — metadata contents and recent " +
    "scenes — for injection into the LLM context. The optional " +
    "sceneCount controls how many recent scenes are included " +
    "(default: 5).",
  parameters: LoadContextParamsSchema,
  execute: async (_toolCallId, params: LoadContextParams) => {
    const sceneCount = params.sceneCount ?? DEFAULT_SCENE_COUNT;

    const metadata = await loadMetadata(DEFAULT_BIBLE_PATH);
    setMetadata(metadata, DEFAULT_BIBLE_PATH);
    const metadataJson = serializeMetadataForContext(metadata);

    // Load recent scenes — sort by filename (lexicographic = deterministic)
    let recentScenes: LoadContextRecentScene[] = [];
    try {
      const entries = await readdir(DEFAULT_SCENES_DIR, { withFileTypes: true });
      const mdFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name)
        .sort();

      const lastN = mdFiles.slice(-sceneCount);

      for (const name of lastN) {
        const filePath = join(DEFAULT_SCENES_DIR, name);
        const coreResult = await readScene(filePath);
        if (!coreResult.ok) continue;

        const doc = coreResult.data;
        recentScenes.push({
          id: doc.id,
          title: doc.title,
          status: SceneStatus[doc.status] ?? String(doc.status),
          wordCount: wordCount(doc.prose),
          prose: doc.prose,
          metadata: {
            pov: doc.metadata.pov ?? "",
            characters: doc.metadata.characters ?? [],
            locations: doc.metadata.locations ?? [],
            chronology: doc.metadata.chronology ?? "",
            tension: doc.metadata.tension ?? 0,
            mood: doc.metadata.mood ?? "",
            plotThreads: doc.metadata.plotThreads ?? [],
            thematicMotifs: doc.metadata.thematicMotifs ?? [],
            dramaticQuestions: doc.metadata.dramaticQuestions ?? [],
          },
          customFields: doc.customFields ?? {},
        });
      }
    } catch {
      // Directory doesn't exist — return empty scenes
    }

    const result: LoadContextResult = { bible: metadataJson, recentScenes };
    return {
      content: textContent(JSON.stringify({ bible: metadataJson, sceneCount: recentScenes.length }, null, 2)),
      details: result,
    };
  },
});

// ── Metadata serialization ──────────────────────────────────────────────────

function serializeMetadataForContext(bible: InMemoryStoryBible): Record<string, unknown> {
  const characters = [...bible.characters.entries()].map(([id, state]) => ({
    id,
    name: state.name,
    aliases: state.aliases,
    traits: state.traits,
    relationships: Object.fromEntries(state.relationships),
    tags: state.tags,
  }));

  const locations = [...bible.locations.entries()].map(([id, state]) => ({
    id,
    name: state.name,
    description: state.description,
    tags: state.tags,
  }));

  const plotThreads = [...bible.plotThreads.entries()].map(([id, state]) => ({
    id,
    name: state.name,
    description: state.description,
    status: state.status,
  }));

  const arcs = [...bible.arcs.entries()].map(([id, state]) => ({
    id,
    name: state.name,
    description: state.description,
    beatIds: state.beatIds,
    completedBeatIds: state.completedBeatIds,
    progress: state.progress,
  }));

  return {
    characters,
    locations,
    plotThreads,
    arcs,
  };
}
